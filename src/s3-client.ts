import * as core from "@actions/core";
import * as fs from "fs";
import * as s3 from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { Inputs } from "./constants";

export class S3Client {
  private readonly client: s3.S3Client;
  private readonly bucketName: string;

  constructor() {
    const region =
      core.getInput(Inputs.AWSRegion) || process.env["AWS_REGION"] || "";
    const accessKeyId =
      core.getInput(Inputs.AWSAccessKeyId) ||
      process.env["AWS_ACCESS_KEY_ID"] ||
      "";
    const secretAccessKey =
      core.getInput(Inputs.AWSSecretAccessKey) ||
      process.env["AWS_SECRET_ACCESS_KEY"] ||
      "";
    const sessionToken =
      core.getInput(Inputs.AWSSessionToken) ||
      process.env["AWS_SESSION_TOKEN"] ||
      "";
    this.client = new s3.S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });
    this.bucketName = core.getInput(Inputs.BucketName, { required: true });
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
