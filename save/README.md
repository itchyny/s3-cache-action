# s3-cache-action/save
This action saves the cache to Amazon S3.

## Usage
```yaml
- uses: itchyny/s3-cache-action/save@v1
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    bucket-name: ${{ vars.S3_CACHE_BUCKET_NAME }}
    aws-region: ${{ vars.S3_CACHE_AWS_REGION }}
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

See [s3-cache-action](../) for more details.
Refer to [action.yaml](action.yaml) for the documentation of the inputs.
