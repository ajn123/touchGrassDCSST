# OpenSearch Node.js Commands

This guide shows how to use the OpenSearch migration scripts as standalone Node.js commands without SST.

## Quick Start

### 1. Setup Environment

```bash
npm run setup:env
```

This creates a `.env.opensearch` file with template values.

### 2. Configure Your OpenSearch Domain

Edit `.env.opensearch` with your actual values:

```bash
# OpenSearch endpoint (get from AWS Console)
OPENSEARCH_ENDPOINT=https://search-your-domain.us-east-1.es.amazonaws.com

# OpenSearch credentials
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your-password

# OpenSearch index name
OPENSEARCH_INDEX=events

# DynamoDB table name
DYNAMODB_TABLE=your-table-name

# AWS region
AWS_REGION=us-east-1
```

### 3. Load Environment Variables

```bash
source .env.opensearch
```

### 4. Run Migration

```bash
npm run node:migrate
```

### 5. Test Search

```bash
npm run node:test:search
```

## Available Commands

| Command                    | Description                             |
| -------------------------- | --------------------------------------- |
| `npm run setup:env`        | Creates `.env.opensearch` template file |
| `npm run node:migrate`     | Migrates DynamoDB data to OpenSearch    |
| `npm run node:test`        | Tests OpenSearch connection             |
| `npm run node:test:search` | Tests search functionality              |

## Environment Variables

| Variable              | Description                       | Required |
| --------------------- | --------------------------------- | -------- |
| `OPENSEARCH_ENDPOINT` | Your OpenSearch domain endpoint   | Yes      |
| `OPENSEARCH_USERNAME` | OpenSearch username               | Yes      |
| `OPENSEARCH_PASSWORD` | OpenSearch password               | Yes      |
| `OPENSEARCH_INDEX`    | Index name (default: "events")    | No       |
| `DYNAMODB_TABLE`      | DynamoDB table name               | Yes      |
| `AWS_REGION`          | AWS region (default: "us-east-1") | No       |

## Getting Your OpenSearch Endpoint

1. Go to AWS Console → OpenSearch Service
2. Click on your domain
3. Copy the "Endpoint" URL
4. It should look like: `https://search-your-domain.us-east-1.es.amazonaws.com`

## Troubleshooting

### "Please set OPENSEARCH_ENDPOINT"

- Make sure you've set the environment variable
- Check that the endpoint URL is correct

### "Please set OPENSEARCH_USERNAME and OPENSEARCH_PASSWORD"

- Set your OpenSearch credentials
- These are usually the master user credentials you set when creating the domain

### "No permissions for [indices:monitor/stats]"

- Your AWS credentials need OpenSearch permissions
- Add this IAM policy to your user/role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "es:ESHttp*",
        "es:DescribeElasticsearchDomain",
        "es:ListDomainNames"
      ],
      "Resource": "arn:aws:es:us-east-1:YOUR-ACCOUNT:domain/YOUR-DOMAIN/*"
    }
  ]
}
```

## Example Usage

```bash
# Setup
npm run setup:env
# Edit .env.opensearch with your values
source .env.opensearch

# Test connection
npm run node:test

# Migrate data
npm run node:migrate

# Test search
npm run node:test:search
```

## Category Search Fix

The scripts now properly handle category searches:

- Categories are stored as arrays: `["Sports", "Running"]`
- Supports both exact matches and fuzzy text search
- Aggregations work to show all unique categories

If you're still having issues with category search, make sure to:

1. Recreate the index with the new mapping
2. Re-migrate all data
3. Test the search functionality
