import * as core from "@actions/core";

import { lookupCache, restoreCache } from "./cache";
import { Inputs, Outputs, State } from "./constants";
import { newS3Client, splitInput } from "./utils";

export async function restore() {
  // Get the inputs.
  const path = splitInput(core.getInput(Inputs.Path, { required: true }));
  const key = core.getInput(Inputs.Key, { required: true });
  const restoreKeys = splitInput(core.getInput(Inputs.RestoreKeys));
  const lookupOnly = core.getInput(Inputs.LookupOnly) === "true";
  const failOnCacheMiss = core.getInput(Inputs.FailOnCacheMiss) === "true";
  const bucketName = core.getInput(Inputs.BucketName, { required: true });
  core.debug(`${Inputs.Path}: [${path.join(", ")}]`);
  core.debug(`${Inputs.Key}: ${key}`);
  core.debug(`${Inputs.RestoreKeys}: [${restoreKeys.join(", ")}]`);
  core.debug(`${Inputs.LookupOnly}: ${lookupOnly}`);
  core.debug(`${Inputs.FailOnCacheMiss}: ${failOnCacheMiss}`);
  core.debug(`${Inputs.BucketName}: ${bucketName}`);

  // Save the inputs to the state for the post job, to avoid re-evaluations.
  core.saveState(State.CachePath, path.join("\n"));
  core.saveState(State.CacheKey, key);

  // Restore or lookup the cache from S3.
  const matchedKey = lookupOnly
    ? await lookupCache(path, key, restoreKeys, bucketName, newS3Client())
    : await restoreCache(path, key, restoreKeys, bucketName, newS3Client());
  if (matchedKey) {
    core.saveState(State.CacheMatchedKey, matchedKey);
    core.setOutput(Outputs.CacheHit, matchedKey === key);
  } else if (failOnCacheMiss) {
    throw new Error(
      `Cache not found in S3 with key: ${key}, restore keys: [${restoreKeys.join(", ")}]`,
    );
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
