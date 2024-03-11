import * as fs from "fs";
import * as tar from "tar";
import * as core from "@actions/core";
import * as s3 from "@aws-sdk/client-s3";
import { Inputs, Outputs, State } from "./constants";
import { S3Client } from "./s3-client";
import { split, mktemp } from "./util";

async function restore() {
  try {
    const path = split(core.getInput(Inputs.Path, { required: true }));
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = split(core.getInput(Inputs.RestoreKeys));
    core.debug(`${Inputs.Path}: ${path.join(", ")}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys.join(", ")}`);

    try {
      const archive = mktemp(".tar.gz");
      await new S3Client().getObject(key, fs.createWriteStream(archive));
      core.debug(`Extracting archive: ${archive}`);
      await tar.extract({ file: archive });
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
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

restore();
