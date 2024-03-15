import * as core from "@actions/core";
import * as fs from "fs";
import * as tar from "tar";

import { Inputs, Outputs, State } from "./constants";
import { S3Client } from "./s3-client";
import { archivePath, fileName, fileSize, splitInput } from "./utils";

async function restore() {
  try {
    const path = splitInput(core.getInput(Inputs.Path, { required: true }));
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = splitInput(core.getInput(Inputs.RestoreKeys));
    core.debug(`${Inputs.Path}: ${path.join(", ")}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys.join(", ")}`);
    core.saveState(State.CachePath, path.join("\n"));
    core.saveState(State.CacheKey, key);

    const client = new S3Client();
    const file = fileName(path);
    const archive = archivePath();
    let matchedKey: string | undefined;
    if (await client.getObject(key, file, fs.createWriteStream(archive))) {
      matchedKey = key;
    } else {
      core.info(`Cache not found in S3 with key ${key}.`);
      L: for (const restoreKey of restoreKeys) {
        for (const key of await client.listObjects(restoreKey, file)) {
          if (await client.getObject(key, file, fs.createWriteStream(archive))) {
            matchedKey = key;
            break L;
          }
        }
        core.info(`Cache not found in S3 with restore key ${restoreKey}.`);
      }
    }

    if (matchedKey) {
      core.debug(`Extracting archive ${archive}.`);
      // @ts-expect-error: `preservePaths` is missing
      await tar.extract({ file: archive, preservePaths: true });
      core.saveState(State.CacheMatchedKey, matchedKey);
      core.setOutput(Outputs.CacheHit, matchedKey === key);
      core.info(`Cache restored from S3 with key ${matchedKey}, ${fileSize(archive)} bytes.`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error);
    }
  }
}

restore();
