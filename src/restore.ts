import * as fs from "fs";
import { join } from "path";
import * as core from "@actions/core";
import * as s3 from "@aws-sdk/client-s3";
import * as tar from "@actions/cache/lib/internal/tar";
import {
  CacheFilename,
  CompressionMethod,
} from "@actions/cache/lib/internal/constants";
import { createTempDirectory } from "@actions/cache/lib/internal/cacheUtils";
import { Inputs, Outputs, State } from "./constants";
import { S3Client } from "./s3-client";

async function restore() {
  try {
    const path = core.getInput(Inputs.Path, { required: true });
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = core
      .getInput(Inputs.RestoreKeys)
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== "");
    core.debug(`${Inputs.Path}: ${path}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys.join(", ")}`);
    core.saveState(State.CacheKey, key);

    try {
      const dir = await createTempDirectory();
      const archive = join(dir, CacheFilename.Gzip);
      let matchedKey: string | undefined;
      try {
        await new S3Client().getObject(key, fs.createWriteStream(archive));
        matchedKey = key;
      } catch (error: unknown) {
        if (!(error instanceof s3.NoSuchKey)) {
          throw error;
        }
        core.info(`Cache not found in S3 with key: ${key}`);
        for (const restoreKey of restoreKeys) {
          const matchedKeys = await new S3Client().listObjects(restoreKey);
          if (matchedKeys.length === 0) {
            core.info(`Cache not found in S3 with restore key: ${restoreKey}`);
            continue;
          }
          core.debug(`Matched keys: ${matchedKeys.join(", ")}`);
          await new S3Client().getObject(
            matchedKeys.at(-1)!,
            fs.createWriteStream(archive),
          );
          matchedKey = matchedKeys.at(-1)!;
          break;
        }
      }
      if (matchedKey) {
        core.debug(`Extracting archive: ${archive}`);
        await tar.extractTar(archive, CompressionMethod.Gzip);
        core.saveState(State.CacheMatchedKey, matchedKey);
        core.setOutput(Outputs.CacheHit, matchedKey === key);
        core.info(`Cache restored from S3 with key: ${matchedKey}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
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
