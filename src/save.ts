import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as fs from "fs";
import * as tar from "tar";

import { Inputs, State } from "./constants";
import { S3Client } from "./s3-client";
import { mktemp, size, split } from "./utils";

async function save() {
  try {
    const path = split(core.getInput(Inputs.Path, { required: true }));
    const key = core.getState(State.CacheKey) || core.getInput(Inputs.Key);
    core.debug(`${Inputs.Path}: ${path.join(", ")}`);
    core.debug(`${Inputs.Key}: ${key}`);

    const restoredKey = core.getState(State.CacheMatchedKey);
    if (restoredKey === key) {
      core.info(`Cache restored from S3 with key ${key}, not saving cache.`);
      return;
    }

    const client = new S3Client();
    if (await client.headObject(key)) {
      core.info(`Cache found in S3 with key ${key}, not saving cache.`);
      return;
    }

    const paths = await glob
      .create(path.join("\n"), { implicitDescendants: false })
      .then((globber) => globber.glob());
    const archive = mktemp(".tar.gz");
    core.debug(`Creating archive: ${archive}`);
    await tar.create({ file: archive, gzip: true, preservePaths: true }, paths);
    await client.putObject(key, fs.createReadStream(archive));
    core.info(`Cache saved to S3 with key ${key}, ${size(archive)} bytes.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error);
    }
  }
}

save();
