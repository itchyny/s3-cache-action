# Changelog
## [v1.1.4](https://github.com/itchyny/s3-cache-action/compare/v1.1.3..v1.1.4) (2025-06-01)
* update `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` from 3.701.0 to 3.821.0
* update `tar` from 6.2.1 to 7.4.3

## [v1.1.3](https://github.com/itchyny/s3-cache-action/compare/v1.1.2..v1.1.3) (2024-12-01)
* update `@actions/core` from 1.10.1 to 1.11.1
* update `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` from 3.658.1 to 3.701.0

## [v1.1.2](https://github.com/itchyny/s3-cache-action/compare/v1.1.1..v1.1.2) (2024-10-01)
* update `@actions/glob` from 0.4.0 to 0.5.0
* update `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` from 3.600.0 to 3.658.1

## [v1.1.1](https://github.com/itchyny/s3-cache-action/compare/v1.1.0..v1.1.1) (2024-06-19)
* improve logic for checking cache hit state to skip saving cache
* update `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` from 3.540.0 to 3.600.0

## [v1.1.0](https://github.com/itchyny/s3-cache-action/compare/v1.0.1..v1.1.0) (2024-04-08)
* implement `lookup-only` option to lookup the cache without downloading it
* implement `fail-on-cache-miss` option to fail the action if the cache is not found

## [v1.0.1](https://github.com/itchyny/s3-cache-action/compare/v1.0.0..v1.0.1) (2024-04-01)
* update `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` from 3.529.1 to 3.540.0
* update `tar` from 6.2.0 to 6.2.1

## [v1.0.0](https://github.com/itchyny/s3-cache-action/compare/80e5042..v1.0.0) (2024-03-22)
* initial implementation of `s3-cache-action` and the npm package
