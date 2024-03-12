export enum Inputs {
  Path = "path",
  Key = "Key",
  RestoreKeys = "restore-keys",
  BucketName = "bucket-name",
  AWSRegion = "aws-region",
  AWSAccessKeyId = "aws-access-key-id",
  AWSSecretAccessKey = "aws-secret-access-key",
  AWSSessionToken = "aws-session-token",
}

export enum Outputs {
  CacheHit = "cache-hit",
}

export enum State {
  CacheKey = "CACHE_KEY",
  CacheMatchedKey = "CACHE_MATCHED_KEY",
}

export enum Env {
  AWSRegion = "AWS_REGION",
  AWSAccessKeyId = "AWS_ACCESS_KEY_ID",
  AWSSecretAccessKey = "AWS_SECRET_ACCESS_KEY",
  AWSSessionToken = "AWS_SESSION_TOKEN",
}
