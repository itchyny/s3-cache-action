import * as fs from "fs";
import * as tar from "tar";
import * as core from "@actions/core";
import { Inputs, State } from "./constants";
import { S3Client } from "./s3-client";
import { split, mktemp } from "./util";

async function save() {
  try {
    const path = split(core.getInput(Inputs.Path, { required: true }));
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = split(core.getInput(Inputs.RestoreKeys));
    core.debug(`${Inputs.Path}: ${path.join(", ")}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys.join(", ")}`);

    const restoredKey = core.getState(State.CacheMatchedKey);
    if (restoredKey === key) {
      core.info(`Cache restored from S3 with key ${key}, not saving cache.`);
      return;
    }

    const archive = mktemp(".tar.gz");
    core.debug(`Creating archive: ${archive}`);
    await tar.create({ file: archive, gzip: true }, path);
    await new S3Client().putObject(key, fs.createReadStream(archive));
    core.info(`Cache saved to S3 with key: ${key}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

save();
