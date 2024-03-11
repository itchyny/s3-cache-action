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
  CacheMatchedKey = "CACHE_MATCHED_KEY",
}
