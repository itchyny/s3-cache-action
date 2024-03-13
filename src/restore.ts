import * as core from "@actions/core";
import * as fs from "fs";
import * as tar from "tar";

import { Inputs, Outputs, State } from "./constants";
import { S3Client } from "./s3-client";
import { mktemp, size, split } from "./util";

async function restore() {
  try {
    const path = core.getInput(Inputs.Path, { required: true });
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = split(core.getInput(Inputs.RestoreKeys));
    core.debug(`${Inputs.Path}: ${path}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys.join(", ")}`);
    core.saveState(State.CacheKey, key);

    const client = new S3Client();
    const archive = mktemp(".tar.gz");
    let matchedKey: string | undefined;
    if (await client.getObject(key, fs.createWriteStream(archive))) {
      matchedKey = key;
    } else {
      core.info(`Cache not found in S3 with key: ${key}`);
      for (const restoreKey of restoreKeys) {
        const matchedKeys = await client.listObjects(restoreKey);
        if (matchedKeys.length === 0) {
          core.info(`Cache not found in S3 with restore key: ${restoreKey}`);
          continue;
        }
        core.debug(`Matched keys: ${matchedKeys.join(", ")}`);
        const key = matchedKeys.at(-1)!;
        if (await client.getObject(key, fs.createWriteStream(archive))) {
          matchedKey = key;
          break;
        }
      }
    }

    if (matchedKey) {
      core.debug(`Extracting archive: ${archive}`);
      // @ts-expect-error: `preservePaths` is missing
      await tar.extract({ file: archive, preservePaths: true });
      core.saveState(State.CacheMatchedKey, matchedKey);
      core.setOutput(Outputs.CacheHit, matchedKey === key);
      core.info(
        `Cache restored from S3 with key: ${matchedKey}, size: ${size(archive)} bytes`,
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error);
    }
  }
}

restore();
