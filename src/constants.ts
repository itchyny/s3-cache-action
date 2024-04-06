export enum Inputs {
  Path = "path",
  Key = "key",
  RestoreKeys = "restore-keys",
  LookupOnly = "lookup-only",
  FailOnCacheMiss = "fail-on-cache-miss",
  BucketName = "bucket-name",
  AWSRegion = "aws-region",
  AWSAccessKeyId = "aws-access-key-id",
  AWSSecretAccessKey = "aws-secret-access-key",
  AWSSessionToken = "aws-session-token",
}

export enum Env {
  AWSRegion = "AWS_REGION",
  AWSAccessKeyId = "AWS_ACCESS_KEY_ID",
  AWSSecretAccessKey = "AWS_SECRET_ACCESS_KEY",
  AWSSessionToken = "AWS_SESSION_TOKEN",
}

export enum Outputs {
  CacheHit = "cache-hit",
}

export enum State {
  CachePath = "CACHE_PATH",
  CacheKey = "CACHE_KEY",
  CacheMatchedKey = "CACHE_MATCHED_KEY",
}
