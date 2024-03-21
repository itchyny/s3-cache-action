import "aws-sdk-client-mock-jest";

import * as s3 from "@aws-sdk/client-s3";
import * as fs from "fs";

import { restoreCache, saveCache } from "../src/cache";
import { addCleanupFiles, createReadStream, s3Mock } from "./setup";

const bucketName = "test-bucket-name";
const s3Client = new s3.S3Client({ region: "ap-northeast-1" });

describe("saveCache", () => {
  it("should save the cache successfully", async () => {
    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
      .on(s3.PutObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .resolves({});

    expect(await saveCache(["tests"], "test-key", bucketName, s3Client)).toBe(true);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.PutObjectCommand, 1);
  });

  it("should save the cache with glob path", async () => {
    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b31ec5f19793e2b7103acd7336754a1c.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
      .on(s3.PutObjectCommand, {
        Key: "test-key/b31ec5f19793e2b7103acd7336754a1c.tar.gz",
      })
      .resolves({});

    expect(await saveCache(["*.json"], "test-key", bucketName, s3Client)).toBe(true);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.PutObjectCommand, 1);
  });

  it("should not save the cache if the cache has been saved already", async () => {
    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .resolves({});

    expect(await saveCache(["tests"], "test-key", bucketName, s3Client)).toBe(false);
  });
});

describe("restoreCache", () => {
  it("should restore the cache successfully", async () => {
    addCleanupFiles("tests/test.txt");

    s3Mock
      .on(s3.GetObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .resolves({
        Body: createReadStream("tests/test.tar.gz"),
      });

    expect(await restoreCache(["tests/test.txt"], "test-key", [], bucketName, s3Client)).toBe(
      "test-key",
    );
    expect(fs.existsSync("tests/test.txt")).toBeTruthy();
    expect(fs.readFileSync("tests/test.txt", "utf-8")).toBe("Hello, world!\n");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.GetObjectCommand, 1);
  });

  it("should restore the cache with restore keys", async () => {
    addCleanupFiles("tests/test.txt");

    s3Mock
      .on(s3.GetObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .rejects(new s3.NoSuchKey({ $metadata: {}, message: "No Such Key" }))
      .on(s3.ListObjectsV2Command, {
        Prefix: "test-",
      })
      .resolves({
        Contents: [
          {
            Key: "test-key1/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
            LastModified: new Date("2024-03-18T02:00:00Z"),
          },
          {
            Key: "test-key2/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
            LastModified: new Date("2024-03-18T01:00:00Z"),
          },
          {
            Key: "test-key3/8c69ddde1da2f30d48825fdfec8a3a4c.tar.gz",
            LastModified: new Date("2024-03-18T03:00:00Z"),
          },
        ],
      })
      .on(s3.GetObjectCommand, {
        Key: "test-key1/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .resolves({
        Body: createReadStream("tests/test.tar.gz"),
      });

    expect(
      await restoreCache(["tests/test.txt"], "test-key", ["test-"], bucketName, s3Client),
    ).toBe("test-key1");
    expect(fs.existsSync("tests/test.txt")).toBeTruthy();
    expect(fs.readFileSync("tests/test.txt", "utf-8")).toBe("Hello, world!\n");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.GetObjectCommand, 2);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.ListObjectsV2Command, 1);
  });

  it("should return undefined if the cache is not found", async () => {
    s3Mock
      .on(s3.GetObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .rejects(new s3.NoSuchKey({ $metadata: {}, message: "No Such Key" }))
      .on(s3.ListObjectsV2Command, {
        Prefix: "test-",
      })
      .resolves({ Contents: [] });

    expect(
      await restoreCache(["tests/test.txt"], "test-key", ["test-"], bucketName, s3Client),
    ).toBeUndefined();
    expect(s3Mock).toHaveReceivedCommandTimes(s3.GetObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.ListObjectsV2Command, 1);
  });
});
