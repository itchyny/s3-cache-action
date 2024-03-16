# s3-cache-action
This action is a minimal implementation of a cache action that caches files to Amazon S3.
This action works similarly to [actions/cache](https://github.com/actions/cache), but uses Amazon S3 as the backend.

## Usage
The action can be used in the same way as `actions/cache`, but requires input parameters for S3 bucket name and AWS credentials.
Firstly, learn the basic usage of `actions/cache` in [GitHub Docs: Using the cache action](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows#using-the-cache-action).
The input parameters `path`, `key`, `restore-keys`, and the output parameter `cache-hit` are compatible with `actions/cache`.
For examples of caching configurations in each language, see [actions/cache: Implementation Examples](https://github.com/actions/cache#implementation-examples).

```yaml
- uses: itchyny/s3-cache-action@v1
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
    bucket-name: ${{ vars.S3_CACHE_BUCKET_NAME }}
    aws-region: ${{ vars.S3_CACHE_AWS_REGION }}
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

Attach `s3:GetObject`, `s3:PutObject` on the bucket objects, and `s3:ListBucket` on the bucket to the IAM role of the AWS credentials.

You can also use [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) to configure the AWS credentials.
However, note that the credentials are stored in the environment variables, and can be accessed in subsequent steps.

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-region: ${{ vars.S3_CACHE_AWS_REGION }}
    role-to-assume: ${{ vars.S3_CACHE_ASSUME_ROLE_ARN }}
- uses: itchyny/s3-cache-action@v1
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
    bucket-name: ${{ vars.S3_CACHE_BUCKET_NAME }}
```

Refer to [action.yaml](https://github.com/itchyny/s3-cache-action/blob/main/action.yaml) for the documentation of the inputs and outputs.

## Differences from actions/cache

- The action does not have cache scope based on branches, so it may restore caches from a sibling branch.
  You can include `${{ github.ref_name }}` in `key` and default branch name in `restore-keys` to emulate the behavior.
  The action implements cache versioning based on the `path`, so you don't need to change the `key` when changing the `path`.
- The action does not separate caches based on the operating system, especially for Windows.
  You can include `${{ runner.os }}` in `key` and `restore-keys`.
- The action does not provide separate save-only and restore-only actions (yet).
  The action does not provide `fail-on-cache-miss` and `lookup-only` options (yet).
  The action always uses `.tar.gz` archive format for implementation simplicity.

## Bug Tracker
Report bug at [Issues・itchyny/s3-cache-action - GitHub](https://github.com/itchyny/s3-cache-action/issues).

## Author
itchyny (<https://github.com/itchyny>)

## License
This software is released under the MIT License, see LICENSE.
