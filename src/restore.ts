import * as fs from "fs";
import * as core from "@actions/core";
import * as s3 from "@aws-sdk/client-s3";
import { Inputs, Outputs, State } from "./constants";
import { S3Client } from "./s3-client";

async function restore() {
  try {
    const path = core.getInput(Inputs.Path, { required: true });
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = core.getInput(Inputs.RestoreKeys);
    core.debug(`${Inputs.Path}: ${path}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys}`);

    const client = new S3Client();
    const stream = fs.createWriteStream(`${path}.tmp`);
    try {
      await client.getObject(key, stream);
      fs.renameSync(`${path}.tmp`, path);
      core.saveState(State.CacheMatchedKey, key);
      core.setOutput(Outputs.CacheHit, "true");
      core.info(`Cache restored from S3 with key: ${key}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error instanceof s3.NoSuchKey) {
          core.info(`Cache not found in S3 with key: ${key}`);
          return;
        }
        core.warning(error.message);
      }
    } finally {
      stream.destroy();
      if (fs.existsSync(`${path}.tmp`)) {
        fs.unlinkSync(`${path}.tmp`);
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

restore();
