import * as fs from "fs";
import * as core from "@actions/core";
import { Inputs, State } from "./constants";
import { S3Client } from "./s3-client";

async function save() {
  try {
    const path = core.getInput(Inputs.Path, { required: true });
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = core.getInput(Inputs.RestoreKeys);
    core.debug(`${Inputs.Path}: ${path}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys}`);

    const restoredKey = core.getState(State.CacheMatchedKey);
    if (restoredKey === key) {
      core.info(`Cache restored from S3 with key ${key}, not saving cache.`);
      return;
    }

    const client = new S3Client();
    const stream = fs.createReadStream(path);
    try {
      await client.putObject(key, stream);
      core.info(`Cache saved to S3 with key: ${key}`);
    } finally {
      stream.destroy();
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

save();
