import * as fs from "fs";
import { join } from "path";
import * as glob from "@actions/glob";
import * as core from "@actions/core";
import * as tar from "@actions/cache/lib/internal/tar";
import { createTempDirectory } from "@actions/cache/lib/internal/cacheUtils";
import {
  CacheFilename,
  CompressionMethod,
} from "@actions/cache/lib/internal/constants";
import { Inputs, State } from "./constants";
import { S3Client } from "./s3-client";

async function save() {
  try {
    const path = core.getInput(Inputs.Path, { required: true });
    const key = core.getState(State.CacheKey) || core.getInput(Inputs.Key);
    core.debug(`${Inputs.Path}: ${path}`);
    core.debug(`${Inputs.Key}: ${key}`);

    const restoredKey = core.getState(State.CacheMatchedKey);
    if (restoredKey === key) {
      core.info(`Cache restored from S3 with key ${key}, not saving cache.`);
      return;
    }

    const paths = await glob.create(path).then((globber) => globber.glob());
    const dir = await createTempDirectory();
    const archive = join(dir, CacheFilename.Gzip);
    core.debug(`Creating archive: ${archive}`);
    await tar.createTar(dir, paths, CompressionMethod.Gzip);
    await new S3Client().putObject(key, fs.createReadStream(archive));
    core.info(`Cache saved to S3 with key: ${key}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

save();
