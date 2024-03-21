# s3-cache-action/restore
This action restores the cache from Amazon S3.

## Usage
```yaml
- uses: itchyny/s3-cache-action/restore@v1
  id: restore-cache
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
    bucket-name: ${{ vars.S3_CACHE_BUCKET_NAME }}
    aws-region: ${{ vars.S3_CACHE_AWS_REGION }}
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
- name: Install dependencies
  if: steps.restore-cache.outputs.cache-hit != 'true'
  run: npm ci --ignore-scripts
```

See [s3-cache-action](../) for more details.
Refer to [action.yaml](action.yaml) for the documentation of the inputs and outputs.
