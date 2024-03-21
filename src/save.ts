import * as core from "@actions/core";

import { saveCache } from "./cache";
import { Inputs, State } from "./constants";
import { newS3Client, splitInput } from "./utils";

export async function save() {
  // Get the inputs.
  const path = splitInput(
    core.getState(State.CachePath) || core.getInput(Inputs.Path, { required: true }),
  );
  const key = core.getState(State.CacheKey) || core.getInput(Inputs.Key, { required: true });
  const bucketName = core.getInput(Inputs.BucketName, { required: true });
  core.debug(`${Inputs.Path}: [${path.join(", ")}]`);
  core.debug(`${Inputs.Key}: ${key}`);
  core.debug(`${Inputs.BucketName}: ${bucketName}`);

  // If the cache has already been restored, don't save it again.
  const restoredKey = core.getState(State.CacheMatchedKey);
  if (restoredKey === key) {
    core.info(`Cache restored from S3 with key ${key}, not saving cache.`);
    return;
  }

  // Save the cache to S3.
  await saveCache(path, key, bucketName, newS3Client());
}

if (require.main === module) {
  (async () => {
    try {
      await save();
    } catch (error: unknown) {
      if (error instanceof Error) {
        core.setFailed(error);
      }
    }
  })();
}
