import "aws-sdk-client-mock-jest";

import * as s3 from "@aws-sdk/client-s3";

import { save } from "../src/save";
import { s3Mock, setState, setupInputs } from "./setup";

describe("save", () => {
  it("should save the cache successfully", async () => {
    setupInputs({ path: "tests", key: "test-key" });

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
      .on(s3.PutObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .resolves({});

    await save();
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.PutObjectCommand, 1);
  });

  it("should save the cache when inputs are stored in the state", async () => {
    setupInputs({});
    setState("CACHE_PATH", "tests");
    setState("CACHE_KEY", "test-key");

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
      .on(s3.PutObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .resolves({});

    await save();
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.PutObjectCommand, 1);
  });

  it("should save the cache with glob path", async () => {
    setupInputs({ path: "*.json", key: "test-key" });

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b31ec5f19793e2b7103acd7336754a1c.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
      .on(s3.PutObjectCommand, {
        Key: "test-key/b31ec5f19793e2b7103acd7336754a1c.tar.gz",
      })
      .resolves({});

    await save();
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.PutObjectCommand, 1);
  });

  it("should not save the cache if the cache has been restored", async () => {
    setupInputs({ path: "tests", key: "test-key" });
    setState("CACHE_MATCHED_KEY", "test-key");

    await save();
    expect(s3Mock).not.toHaveReceivedAnyCommand();
  });

  it("should save the cache if the cache has been restored with a different key", async () => {
    setupInputs({ path: "tests", key: "test-key" });
    setState("CACHE_MATCHED_KEY", "test-another-key");

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .rejects(new s3.NotFound({ $metadata: {}, message: "Not Found" }))
      .on(s3.PutObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .resolves({});

    await save();
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandTimes(s3.PutObjectCommand, 1);
  });

  it("should not save the cache if the cache has been saved already", async () => {
    setupInputs({ path: "tests", key: "test-key" });

    s3Mock
      .on(s3.HeadObjectCommand, {
        Key: "test-key/b61a6d542f9036550ba9c401c80f00ef.tar.gz",
      })
      .resolves({});

    await save();
    expect(s3Mock).toHaveReceivedCommandTimes(s3.HeadObjectCommand, 1);
  });

  it("should throw an error when path input is not supplied", async () => {
    setupInputs({ path: "", key: "test-key" });

    await expect(save()).rejects.toThrow("Input required and not supplied: path");
  });

  it("should throw an error when key input is not supplied", async () => {
    setupInputs({ path: "tests", key: "" });

    await expect(save()).rejects.toThrow("Input required and not supplied: key");
    expect(s3Mock).not.toHaveReceivedAnyCommand();
  });
});
