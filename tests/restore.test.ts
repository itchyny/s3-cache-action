import "aws-sdk-client-mock-jest";

import * as s3 from "@aws-sdk/client-s3";
import * as fs from "fs";

import { restore } from "../src/restore";
import {
  addCleanupFiles,
  createReadStream,
  getOutput,
  getState,
  s3Mock,
  setupInputs,
} from "./setup";

describe("restore", () => {
  it("should restore the cache", async () => {
    setupInputs({ path: "tests/test.txt", key: "test-key" });
    addCleanupFiles("tests/test.txt");

    s3Mock
      .on(s3.GetObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .resolves({
        Body: createReadStream("tests/test.tar.gz"),
      });

    await restore();
    expect(fs.existsSync("tests/test.txt")).toBeTruthy();
    expect(fs.readFileSync("tests/test.txt", "utf-8")).toBe("Hello, world!\n");
    expect(getState("CACHE_PATH")).toBe("tests/test.txt");
    expect(getState("CACHE_KEY")).toBe("test-key");
    expect(getState("CACHE_HIT")).toBe("true");
    expect(getOutput("cache-hit")).toBe("true");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.GetObjectCommand, 1);
  });

  it("should restore the cache with restore keys", async () => {
    setupInputs({ path: "tests/test.txt", key: "test-key", restoreKeys: ["test-"] });
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

    await restore();
    expect(fs.existsSync("tests/test.txt")).toBeTruthy();
    expect(fs.readFileSync("tests/test.txt", "utf-8")).toBe("Hello, world!\n");
    expect(getState("CACHE_PATH")).toBe("tests/test.txt");
    expect(getState("CACHE_KEY")).toBe("test-key");
    expect(getState("CACHE_HIT")).toBe("false");
    expect(getOutput("cache-hit")).toBe("false");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.GetObjectCommand, 2);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.ListObjectsV2Command, 1);
  });

  it("should succeed when cache is not found", async () => {
    setupInputs({ path: "tests/test.txt", key: "test-key", restoreKeys: ["test-"] });

    s3Mock
      .on(s3.GetObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .rejects(new s3.NoSuchKey({ $metadata: {}, message: "No Such Key" }))
      .on(s3.ListObjectsV2Command, {
        Prefix: "test-",
      })
      .resolves({ Contents: [] });

    await restore();
    expect(fs.existsSync("tests/test.txt")).toBeFalsy();
    expect(() => getState("CACHE_HIT")).toThrow("State key not found: CACHE_HIT");
    expect(() => getOutput("cache-hit")).toThrow("Output key not found: cache-hit");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.GetObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.ListObjectsV2Command, 1);
  });

  it("should fail when fail-on-cache-miss is set true and cache is not found", async () => {
    setupInputs({
      path: "tests/test.txt",
      key: "test-key",
      restoreKeys: ["test-"],
      failOnCacheMiss: true,
    });

    s3Mock
      .on(s3.GetObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .rejects(new s3.NoSuchKey({ $metadata: {}, message: "No Such Key" }))
      .on(s3.ListObjectsV2Command, {
        Prefix: "test-",
      })
      .resolves({ Contents: [] });

    await expect(restore()).rejects.toThrow(
      "Cache not found in S3 with key: test-key, restore keys: [test-]",
    );
    expect(fs.existsSync("tests/test.txt")).toBeFalsy();
    expect(() => getState("CACHE_HIT")).toThrow("State key not found: CACHE_HIT");
    expect(() => getOutput("cache-hit")).toThrow("Output key not found: cache-hit");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.GetObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.ListObjectsV2Command, 1);
  });

  it("should lookup the cache successfully", async () => {
    setupInputs({ path: "tests/test.txt", key: "test-key", lookupOnly: true });

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .resolves({});

    await restore();
    expect(fs.existsSync("tests/test.txt")).toBeFalsy();
    expect(getState("CACHE_PATH")).toBe("tests/test.txt");
    expect(getState("CACHE_KEY")).toBe("test-key");
    expect(getState("CACHE_HIT")).toBe("true");
    expect(getOutput("cache-hit")).toBe("true");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
  });

  it("should lookup the cache with restore keys", async () => {
    setupInputs({
      path: "tests/test.txt",
      key: "test-key",
      restoreKeys: ["test-"],
      lookupOnly: true,
    });

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
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
      .on(s3.HeadObjectCommand, {
        Key: "test-key1/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .resolves({});

    await restore();
    expect(fs.existsSync("tests/test.txt")).toBeFalsy();
    expect(getState("CACHE_PATH")).toBe("tests/test.txt");
    expect(getState("CACHE_KEY")).toBe("test-key");
    expect(getState("CACHE_HIT")).toBe("false");
    expect(getOutput("cache-hit")).toBe("false");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 2);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.ListObjectsV2Command, 1);
  });

  it("should succeed when cache is not found on lookup", async () => {
    setupInputs({
      path: "tests/test.txt",
      key: "test-key",
      restoreKeys: ["test-"],
      lookupOnly: true,
    });

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/5ae889e6d39b6deb7b3b9ba1bb15a5f6.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
      .on(s3.ListObjectsV2Command, {
        Prefix: "test-",
      })
      .resolves({ Contents: [] });

    await restore();
    expect(fs.existsSync("tests/test.txt")).toBeFalsy();
    expect(() => getState("CACHE_HIT")).toThrow("State key not found: CACHE_HIT");
    expect(() => getOutput("cache-hit")).toThrow("Output key not found: cache-hit");
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.ListObjectsV2Command, 1);
  });

  it("should throw an error when path input is not supplied", async () => {
    setupInputs({ path: "", key: "test-key" });

    await expect(restore()).rejects.toThrow("Input required and not supplied: path");
    expect(() => getState("CACHE_HIT")).toThrow("State key not found: CACHE_HIT");
    expect(() => getOutput("cache-hit")).toThrow("Output key not found: cache-hit");
    expect(s3Mock).not.toHaveReceivedAnyCommand();
  });

  it("should throw an error when key input is not supplied", async () => {
    setupInputs({ path: "tests/test.txt", key: "" });

    await expect(restore()).rejects.toThrow("Input required and not supplied: key");
    expect(() => getState("CACHE_HIT")).toThrow("State key not found: CACHE_HIT");
    expect(() => getOutput("cache-hit")).toThrow("Output key not found: cache-hit");
    expect(s3Mock).not.toHaveReceivedAnyCommand();
  });
});
