# s3-cache-action
This action is a minimal implementation of a cache action that caches files to Amazon S3.
This action works similarly to [actions/cache](https://github.com/actions/cache) with Amazon S3 as the backend.

## Usage

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

You can also use [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) to configure the AWS credentials.

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-region: ${{ vars.S3_CACHE_AWS_REGION }}
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
- uses: itchyny/s3-cache-action@v1
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
    bucket-name: ${{ vars.S3_CACHE_BUCKET_NAME }}
```

Refer to [action.yaml](https://github.com/itchyny/s3-cache-action/blob/main/action.yaml) for the full documentation.

## Related works

- [actions/cache](https://github.com/actions/cache)
- [whywaita/actions-cache-s3](https://github.com/whywaita/actions-cache-s3)
- [tespkg/actions-cache](https://github.com/tespkg/actions-cache)

## Bug Tracker
Report bug at [Issues・itchyny/s3-cache-action - GitHub](https://github.com/itchyny/s3-cache-action/issues).

## Author
itchyny (https://github.com/itchyny)

## License
This software is released under the MIT License, see LICENSE.
