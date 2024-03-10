import * as core from "@actions/core";
import { Inputs } from "./constants";

async function save(): Promise<void> {
  try {
    const path = core.getInput(Inputs.Path, { required: true });
    const key = core.getInput(Inputs.Key, { required: true });
    const restoreKeys = core.getInput(Inputs.RestoreKeys);
    const bucketName = core.getInput(Inputs.BucketName, { required: true });
    const awsRegion = core.getInput(Inputs.AWSRegion, { required: true });
    const awsAccessKeyId = core.getInput(Inputs.AWSAccessKeyId, {
      required: true,
    });
    const awsSecretAccessKey = core.getInput(Inputs.AWSSecretAccessKey, {
      required: true,
    });
    core.debug(`${Inputs.Path}: ${path}`);
    core.debug(`${Inputs.Key}: ${key}`);
    core.debug(`${Inputs.RestoreKeys}: ${restoreKeys}`);
    core.debug(`${Inputs.BucketName}: ${bucketName}`);
    core.debug(`${Inputs.AWSRegion}: ${awsRegion}`);
    core.debug(`${Inputs.AWSAccessKeyId}: ${awsAccessKeyId.replace(/.*/g, "***")}`);
    core.debug(`${Inputs.AWSSecretAccessKey}: ${awsSecretAccessKey.replace(/.*/g, "***")}`);
  } catch (error: unknown) {
    core.setFailed((error as Error).message);
  }
}

save();
