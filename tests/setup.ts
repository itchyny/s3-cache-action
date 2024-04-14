import * as s3 from "@aws-sdk/client-s3";
import { SdkStream } from "@smithy/types";
import { sdkStreamMixin } from "@smithy/util-stream";
import { mockClient } from "aws-sdk-client-mock";
import * as fs from "fs";
import { Readable } from "stream";
import * as tmp from "tmp";

export const s3Mock = mockClient(s3.S3Client);
const cleanupFiles: string[] = [];

beforeEach(() => {
  clearInputs();
  delete process.env.STATE_CACHE_PATH;
  delete process.env.STATE_CACHE_KEY;
  delete process.env.STATE_CACHE_HIT;
  process.env.GITHUB_STATE = createEmptyFile();
  process.env.GITHUB_OUTPUT = createEmptyFile();
  s3Mock.callsFake((input) => {
    throw new Error(`Unexpected S3 API call: ${JSON.stringify(input)}`);
  });
  cleanupFiles.length = 0;
  jest.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  fs.unlinkSync(process.env.GITHUB_STATE!);
  fs.unlinkSync(process.env.GITHUB_OUTPUT!);
  delete process.env.GITHUB_STATE;
  delete process.env.GITHUB_OUTPUT;
  s3Mock.reset();
  for (const file of cleanupFiles) {
    fs.unlinkSync(file);
  }
});

function createEmptyFile(): string {
  const file = tmp.tmpNameSync();
  fs.writeFileSync(file, "");
  return file;
}

function clearInputs(): void {
  delete process.env["INPUT_PATH"];
  delete process.env["INPUT_KEY"];
  delete process.env["INPUT_RESTORE-KEYS"];
  delete process.env["INPUT_LOOKUP-ONLY"];
  delete process.env["INPUT_FAIL-ON-CACHE-MISS"];
  delete process.env["INPUT_BUCKET-NAME"];
}

export function setupInputs({
  path = "",
  key = "",
  restoreKeys = [],
  lookupOnly = false,
  failOnCacheMiss = false,
  bucketName = "test-bucket-name",
  awsRegion = "ap-northeast-1",
  awsAccessKeyId = "",
  awsSecretAccessKey = "",
  awsSessionToken = "",
}: {
  path?: string;
  key?: string;
  restoreKeys?: string[];
  lookupOnly?: boolean;
  failOnCacheMiss?: boolean;
  bucketName?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
}): void {
  process.env["INPUT_PATH"] = path;
  process.env["INPUT_KEY"] = key;
  process.env["INPUT_RESTORE-KEYS"] = restoreKeys.join("\n");
  process.env["INPUT_LOOKUP-ONLY"] = lookupOnly.toString();
  process.env["INPUT_FAIL-ON-CACHE-MISS"] = failOnCacheMiss.toString();
  process.env["INPUT_BUCKET-NAME"] = bucketName;
  process.env["INPUT_AWS-REGION"] = awsRegion;
  process.env["INPUT_AWS-ACCESS-KEY-ID"] = awsAccessKeyId;
  process.env["INPUT_AWS-SECRET-ACCESS-KEY"] = awsSecretAccessKey;
  process.env["INPUT_AWS-SESSION-TOKEN"] = awsSessionToken;
}

export function setState(key: string, value: string): void {
  process.env[`STATE_${key}`] = value;
}

export function addCleanupFiles(...files: string[]): void {
  cleanupFiles.push(...files);
}

export function createReadStream(file: string): SdkStream<Readable> {
  return sdkStreamMixin(fs.createReadStream(file));
}

export function getState(key: string): string {
  return get("State", process.env.GITHUB_STATE!, key);
}

export function getOutput(key: string): string {
  return get("Output", process.env.GITHUB_OUTPUT!, key);
}

function get(target: "State" | "Output", file: string, key: string): string {
  const pattern = new RegExp(
    `^${key}<<ghadelimiter_[-0-9a-f]+\\r?\\n` + //
      "(.*?)\\r?\\n" + //
      "ghadelimiter_[-0-9a-f]+$",
    "m",
  );
  const match = pattern.exec(fs.readFileSync(file, "utf-8"));
  if (!match) {
    throw new Error(`${target} key not found: ${key}`);
  }
  return match[1];
}
