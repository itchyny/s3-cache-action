import * as core from "@actions/core";
import * as s3 from "@aws-sdk/client-s3";

import { Env, Inputs } from "./constants";

export function splitInput(str: string): string[] {
  return str
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s !== "" && !s.startsWith("#"));
}

export function newS3Client(): s3.S3Client {
  const region = getAWSInput("AWSRegion");
  const accessKeyId = getAWSInput("AWSAccessKeyId");
  const secretAccessKey = getAWSInput("AWSSecretAccessKey");
  const sessionToken = getAWSInput("AWSSessionToken");
  return new s3.S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey, sessionToken },
  });
}

function getAWSInput(key: keyof typeof Inputs & keyof typeof Env): string {
  const value =
    core.getState(Env[key]) || core.getInput(Inputs[key]) || process.env[Env[key]] || "";
  core.saveState(Env[key], value);
  return value;
}
