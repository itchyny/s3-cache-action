import * as core from "@actions/core";
import * as s3 from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { once } from "events";
import * as fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export class Client {
  constructor(
    private readonly bucketName: string,
    private readonly client: s3.S3Client,
  ) {}

  private static joinKey(key: string, file: string): string {
    return `${key}/${file}`;
  }

  private static matchFile(objectKey: string, file: string): boolean {
    return objectKey.endsWith(`/${file}`);
  }

  private static getKey(objectKey: string): string {
    const index = objectKey.lastIndexOf("/");
    if (index === -1) {
      throw new Error(`Invalid object key: ${objectKey}`);
    }
    return objectKey.substring(0, index);
  }

  async getObjectStream(key: string, file: string): Promise<Readable> {
    core.debug(`Streaming object from S3 with key ${key}, file ${file}.`);
    const command = new s3.GetObjectCommand({
        Bucket: this.bucketName,
        Key: Client.joinKey(key, file),
    });

    const response = await this.client.send(command);
    if (!response.Body || !(response.Body instanceof Readable)) {
      throw new Error(`Failed to get S3 object stream with key ${key}, file ${file}`);
    }

    return response.Body;
  }

  async getObject(key: string, file: string, stream: fs.WriteStream): Promise<boolean> {
    core.debug(`Getting object from S3 with key ${key}, file ${file}.`);
    const command = new s3.GetObjectCommand({
      Bucket: this.bucketName,
      Key: Client.joinKey(key, file),
    });
    try {
      const response = await this.client.send(command);
      await pipeline(response.Body! as Readable, stream);
      return true;
    } catch (error: unknown) {
      if (error instanceof s3.NoSuchKey) {
        return false;
      }
      throw error;
    } finally {
      if (!stream.closed) {
        stream.destroy();
        await once(stream, "close");
      }
    }
  }

  async headObject(key: string, file: string): Promise<boolean> {
    core.debug(`Heading object from S3 with key ${key}, file ${file}.`);
    const command = new s3.HeadObjectCommand({
      Bucket: this.bucketName,
      Key: Client.joinKey(key, file),
    });
    try {
      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if (error instanceof s3.NotFound) {
        return false;
      }
      throw error;
    }
  }

  async listObjects(prefix: string, file: string): Promise<string[]> {
    core.debug(`Listing objects from S3 with prefix ${prefix}.`);
    const command = new s3.ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    if (response.IsTruncated) {
      core.info(
        `Too many objects in S3 with prefix ${prefix}, ` +
          `only ${response.KeyCount} objects will be checked.`,
      );
    }
    return (
      response.Contents?.filter((object) => Client.matchFile(object.Key!, file))
        .sort((x, y) => (x.LastModified!.getTime() < y.LastModified!.getTime() ? 1 : -1))
        .map((object) => Client.getKey(object.Key!)) ?? []
    );
  }

  async putObject(key: string, file: string, stream: fs.ReadStream): Promise<void> {
    core.debug(`Putting object to S3 with key ${key}, file ${file}.`);
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucketName,
        Key: Client.joinKey(key, file),
        Body: stream,
      },
    });
    upload.on("httpUploadProgress", ({ loaded, total }) => {
      core.debug(`Uploaded ${loaded} of ${total} bytes.`);
    });
    await upload.done();
  }

  putObjectStream(key: string, file: string, stream: Readable): Upload {
    core.debug(`Putting object to S3 with key ${key}, file ${file}.`);
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucketName,
        Key: Client.joinKey(key, file),
        Body: stream,
      },
    });
    upload.on("httpUploadProgress", ({ loaded, total }) => {
      core.debug(`Uploaded ${loaded} of ${total} bytes.`);
    });
    return upload;
  }
}
