import * as fs from "fs";
import * as tar from "tar";
import * as glob from "@actions/glob";
import * as core from "@actions/core";
import { Inputs, State } from "./constants";
import { S3Client } from "./s3-client";
import { mktemp } from "./util";

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
    const archive = mktemp(".tar.gz");
    core.debug(`Creating archive: ${archive}`);
    await tar.create({ file: archive, gzip: true, preservePaths: true }, paths);
    await new S3Client().putObject(key, fs.createReadStream(archive));
    core.info(`Cache saved to S3 with key: ${key}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

save();
