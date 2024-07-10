import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as s3 from "@aws-sdk/client-s3";
import * as crypto from "crypto";
import * as tar from "tar";
import * as lzma from "lzma-native";
import { pipeline } from "stream/promises";

import { Client } from "./client";
import { PassThrough } from "stream";

/**
 * Save cache to Amazon S3.
 * @param paths The paths to cache.
 * @param key The cache key.
 * @param bucketName The S3 bucket name.
 * @param s3Client The S3 client.
 * @returns A boolean indicating whether the cache is saved or skipped.
 */
export async function saveCache(
  paths: string[],
  key: string,
  bucketName: string,
  s3Client: s3.S3Client,
): Promise<boolean> {
  const client = new Client(bucketName, s3Client);
  const file = fileName(paths);

  // If the cache already exists, do not save the cache.
  if (await client.headObject(key, file)) {
    core.info(`Cache found in S3 with key ${key}, not saving cache.`);
    return false;
  }

  // Expand glob patterns of the paths.
  const expandedPaths = await glob
    .create(paths.join("\n"), { implicitDescendants: false })
    .then((globber) => globber.glob());
  core.debug(`expanded paths: [${expandedPaths.join(", ")}]`);

  core.debug(`Creating, compressing, and uploading cache...`);
  
  const compressStream = lzma.createCompressor();
  const tarStream = tar.create({ preservePaths: true }, expandedPaths);
  const trackedUploadStream = new BandwidthTrackedStream();

  const upload = client.putObjectStream(key, file, trackedUploadStream);

  const pipelinePromise = pipeline(tarStream, compressStream, trackedUploadStream);
  const uploadPromise = upload.done();

  await Promise.all([pipelinePromise, uploadPromise]);
  core.info(`Cache saved to S3 with key ${key}, ${trackedUploadStream.getTotalBytes()} bytes.`);

  return true;
}

/**
 * Restore cache from Amazon S3.
 * @param paths The paths to cache.
 * @param key The cache key.
 * @param restoreKeys The restore keys.
 * @param bucketName The S3 bucket name.
 * @param s3Client The S3 client.
 * @returns The matched key of the cache.
 */
export async function restoreCache(
  paths: string[],
  key: string,
  restoreKeys: string[],
  bucketName: string,
  s3Client: s3.S3Client,
): Promise<string | undefined> {
  const client = new Client(bucketName, s3Client);
  const file = fileName(paths);

  let restoredKey: string | undefined;
  // Restore the cache from S3 with the cache key.
  if (await client.headObject(key, file)) {
    restoredKey = key;
  } else {
    core.info(`Cache not found in S3 with key ${key}.`);
    // Restore the cache from S3 with the restore keys.
    L: for (const restoreKey of restoreKeys) {
      for (const key of await client.listObjects(restoreKey, file)) {
        if (await client.headObject(key, file)) {
          restoredKey = key;
          break L;
        }
      }
      core.info(`Cache not found in S3 with restore key ${restoreKey}.`);
    }
  }

  if (restoredKey) {
    core.debug(`Receiving, decompressing, and extracting cache...`);
    const objectStream = await client.getObjectStream(key, file);
    const trackedStream = new BandwidthTrackedStream();
    const decompressStream = lzma.createDecompressor();
    const extractStream = tar.extract({ preservePaths: true });

    await pipeline(objectStream, trackedStream, decompressStream, extractStream);

    core.info(`Cache restored from S3 with key ${restoredKey}, ${trackedStream.getTotalBytes()} bytes.`);
  }

  return restoredKey;
}

/**
 * Lookup cache from Amazon S3.
 * @param paths The paths to cache.
 * @param key The cache key.
 * @param restoreKeys The restore keys.
 * @param bucketName The S3 bucket name.
 * @param s3Client The S3 client.
 * @returns The matched key of the cache.
 */
export async function lookupCache(
  paths: string[],
  key: string,
  restoreKeys: string[],
  bucketName: string,
  s3Client: s3.S3Client,
): Promise<string | undefined> {
  const client = new Client(bucketName, s3Client);
  const file = fileName(paths);

  let foundKey: string | undefined;
  // Lookup the cache from S3 with the cache key.
  if (await client.headObject(key, file)) {
    core.info(`Cache found in S3 with key ${key}.`);
    foundKey = key;
  } else {
    core.info(`Cache not found in S3 with key ${key}.`);
    // Lookup the cache from S3 with the restore keys.
    L: for (const restoreKey of restoreKeys) {
      for (const key of await client.listObjects(restoreKey, file)) {
        if (await client.headObject(key, file)) {
          core.info(`Cache found in S3 with key ${key}, restore key ${restoreKey}.`);
          foundKey = key;
          break L;
        }
      }
      core.info(`Cache not found in S3 with restore key ${restoreKey}.`);
    }
  }

  return foundKey;
}

function fileName(paths: string[]): string {
  const hash = crypto.createHash("md5").update(paths.join("\n")).digest("hex");
  return `${hash}.tar.xz`;
}

class BandwidthTrackedStream extends PassThrough {
  private totalBytes: number = 0;

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.totalBytes += chunk.length;
    super._write(chunk, encoding, callback);
  }

  getTotalBytes(): number {
    return this.totalBytes;
  }
}
