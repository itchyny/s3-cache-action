import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as s3 from "@aws-sdk/client-s3";
import * as crypto from "crypto";
import * as fs from "fs";
import * as tar from "tar";
import * as tmp from "tmp";

import { Client } from "./client";

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

  // Create a tarball archive.
  const archive = archivePath();
  try {
    core.debug(`Creating archive ${archive}.`);
    await tar.create({ file: archive, gzip: true, preservePaths: true }, expandedPaths);

    // Save the cache to S3.
    await client.putObject(key, file, fs.createReadStream(archive));
    core.info(`Cache saved to S3 with key ${key}, ${fileSize(archive)} bytes.`);
    return true;
  } finally {
    try {
      core.debug(`Deleting archive ${archive}.`);
      fs.unlinkSync(archive);
    } catch (error: unknown) {
      if (error instanceof Error && !("code" in error && error.code === "ENOENT")) {
        core.debug(`Failed to delete archive: ${error}`);
      }
    }
  }
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
  const archive = archivePath();

  try {
    let restoredKey: string | undefined;
    // Restore the cache from S3 with the cache key.
    if (await client.getObject(key, file, fs.createWriteStream(archive))) {
      restoredKey = key;
    } else {
      core.info(`Cache not found in S3 with key ${key}.`);
      // Restore the cache from S3 with the restore keys.
      L: for (const restoreKey of restoreKeys) {
        for (const key of await client.listObjects(restoreKey, file)) {
          if (await client.getObject(key, file, fs.createWriteStream(archive))) {
            restoredKey = key;
            break L;
          }
        }
        core.info(`Cache not found in S3 with restore key ${restoreKey}.`);
      }
    }

    if (restoredKey) {
      // Extract the tarball archive.
      core.debug(`Extracting archive ${archive}.`);
      await tar.extract({ file: archive, preservePaths: true });
      core.info(`Cache restored from S3 with key ${restoredKey}, ${fileSize(archive)} bytes.`);
    }

    return restoredKey;
  } finally {
    try {
      core.debug(`Deleting archive ${archive}.`);
      fs.unlinkSync(archive);
    } catch (error: unknown) {
      if (error instanceof Error && !("code" in error && error.code === "ENOENT")) {
        core.debug(`Failed to delete archive: ${error}`);
      }
    }
  }
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
  return `${hash}.tar.gz`;
}

function archivePath(): string {
  const tmpdir = process.env.RUNNER_TEMP || "";
  return tmp.tmpNameSync({ tmpdir, postfix: ".tar.gz" });
}

function fileSize(file: string): number {
  return fs.statSync(file).size;
}
