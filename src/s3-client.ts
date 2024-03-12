import * as core from "@actions/core";
import * as fs from "fs";
import * as s3 from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { Inputs, Env } from "./constants";

export class S3Client {
  private readonly client: s3.S3Client;
  private readonly bucketName: string;

  constructor() {
    const region = S3Client.getInput("AWSRegion");
    const accessKeyId = S3Client.getInput("AWSAccessKeyId");
    const secretAccessKey = S3Client.getInput("AWSSecretAccessKey");
    const sessionToken = S3Client.getInput("AWSSessionToken");
    this.client = new s3.S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });
    this.bucketName = core.getInput(Inputs.BucketName, { required: true });
  }

  private static getInput(key: keyof typeof Inputs & keyof typeof Env): string {
    const value =
      core.getState(Env[key]) ||
      core.getInput(Inputs[key]) ||
      process.env[Env[key]] ||
      "";
    core.saveState(Env[key], value);
    return value;
  }

  async getObject(key: string, stream: fs.WriteStream): Promise<void> {
    core.debug(`Getting object from S3 with key: ${key}`);
    const command = new s3.GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.client.send(command);
    return new Promise<void>((resolve, reject) => {
      (response.Body! as Readable)
        .pipe(stream)
        .on("error", (err) => reject(err))
        .on("close", () => resolve());
    });
  }

  async listObjects(prefix: string): Promise<string[]> {
    core.debug(`Listing objects from S3 with prefix: ${prefix}`);
    const command = new s3.ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    if (response.IsTruncated) {
      core.info(
        `Too many objects in S3 with prefix ${prefix}, ` +
          `only ${response.KeyCount} objects will be checked`,
      );
    }
    return (
      response.Contents?.sort(
        (x, y) => x.LastModified!.getTime() - y.LastModified!.getTime(),
      ).map((object) => object.Key!) ?? []
    );
  }

  async putObject(key: string, stream: fs.ReadStream): Promise<void> {
    core.debug(`Putting object to S3 with key: ${key}`);
    const upload = new Upload({
      client: this.client,
      params: { Bucket: this.bucketName, Key: key, Body: stream },
    });
    upload.on("httpUploadProgress", ({ loaded, total }) => {
      core.debug(`Uploaded ${loaded} of ${total} bytes`);
    });
    return upload.done().then(() => {});
  }
}
