import * as core from "@actions/core";

import { restoreCache } from "./cache";
import { Inputs, Outputs, State } from "./constants";
import { newS3Client, splitInput } from "./utils";

export async function restore() {
  // Get the inputs.
  const path = splitInput(core.getInput(Inputs.Path, { required: true }));
  const key = core.getInput(Inputs.Key, { required: true });
  const restoreKeys = splitInput(core.getInput(Inputs.RestoreKeys));
  const bucketName = core.getInput(Inputs.BucketName, { required: true });
  core.debug(`${Inputs.Path}: [${path.join(", ")}]`);
  core.debug(`${Inputs.Key}: ${key}`);
  core.debug(`${Inputs.RestoreKeys}: [${restoreKeys.join(", ")}]`);
  core.debug(`${Inputs.BucketName}: ${bucketName}`);

  // Save the inputs to the state for the post job, to avoid re-evaluations.
  core.saveState(State.CachePath, path.join("\n"));
  core.saveState(State.CacheKey, key);

  // Restore the cache from S3.
  const matchedKey = await restoreCache(path, key, restoreKeys, bucketName, newS3Client());
  if (matchedKey) {
    core.saveState(State.CacheMatchedKey, matchedKey);
    core.setOutput(Outputs.CacheHit, matchedKey === key);
  }
}

if (require.main === module) {
  (async () => {
    try {
      await restore();
    } catch (error: unknown) {
      if (error instanceof Error) {
        core.setFailed(error);
      }
    }
  })();
}
