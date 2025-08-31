# OpenSearch Migration Guide

This guide will help you migrate your DynamoDB events and groups data to OpenSearch for powerful fuzzy search capabilities.

## 🚀 Why OpenSearch?

- **Fuzzy Search**: Find results even with typos or partial matches
- **Relevance Scoring**: Better ranking of search results
- **Full-Text Search**: Search across all text fields simultaneously
- **Autocomplete**: Built-in suggestions as users type
- **Complex Queries**: Advanced filtering and aggregation
- **Scalability**: Handle large amounts of data efficiently

## 📋 Prerequisites

1. **AWS OpenSearch Service Domain** (or self-hosted OpenSearch)
2. **AWS Credentials** with access to both DynamoDB and OpenSearch
3. **Node.js** and npm/yarn installed

## 🔧 Setup Steps

### 1. Install Dependencies

```bash
cd packages/scripts
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `packages/scripts` directory:

```bash
# Required
OPENSEARCH_ENDPOINT=https://your-domain.us-east-1.es.amazonaws.com
AWS_REGION=us-east-1

# Optional
OPENSEARCH_INDEX_NAME=touchgrass-search
OPENSEARCH_USE_AWS_AUTH=true
```

### 3. AWS IAM Permissions

Ensure your AWS user/role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Scan", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT:table/YOUR_TABLE"
    },
    {
      "Effect": "Allow",
      "Action": ["es:ESHttp*"],
      "Resource": "arn:aws:es:us-east-1:YOUR_ACCOUNT:domain/YOUR_DOMAIN/*"
    }
  ]
}
```

## 🚀 Running the Migration

### Basic Migration

```bash
npm run migrate:opensearch
```

### Recreate Index (if you need to start fresh)

```bash
npm run migrate:opensearch:recreate
```

### Manual Execution

```bash
npx tsx src/migrate-to-opensearch.ts
# or with recreate flag
npx tsx src/migrate-to-opensearch.ts --recreate
```

## 📊 What Gets Migrated

### Events

- Title, description, category
- Location, venue, dates
- Cost information
- Social media links
- Public/private status

### Groups

- Title, description, category
- Schedule information (day, time, location)
- Social media links
- Public/private status

### Search Features

- **Fuzzy Matching**: "runnig" will find "running"
- **Partial Matches**: "run" will find "running club"
- **Category Search**: Search by activity type
- **Location Search**: Find events/groups by area
- **Autocomplete**: Suggestions as you type

## 🔍 Testing the Migration

After migration, test the search functionality:

```typescript
import { OpenSearchMigrator } from "./src/migrate-to-opensearch";

const migrator = new OpenSearchMigrator({
  endpoint: process.env.OPENSEARCH_ENDPOINT!,
  region: process.env.AWS_REGION!,
  indexName: process.env.OPENSEARCH_INDEX_NAME || "touchgrass-search",
});

// Search for events and groups
const results = await migrator.search("running", {
  type: "event", // or 'group' or omit for both
  limit: 10,
});

console.log("Found:", results.hits.total.value, "results");
```

## 🏗️ OpenSearch Index Structure

The migration creates an index with these mappings:

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "type": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "text_analyzer",
        "fields": {
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer"
          },
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text", "analyzer": "text_analyzer" },
      "category": { "type": "keyword" },
      "location": { "type": "text", "analyzer": "text_analyzer" },
      "venue": { "type": "text", "analyzer": "text_analyzer" },
      "date": { "type": "date" },
      "cost": { "type": "object" },
      "isPublic": { "type": "boolean" },
      "search_text": { "type": "text", "analyzer": "text_analyzer" }
    }
  }
}
```

## 🔧 Customization

### Modify Search Analyzers

Edit the `createIndex()` method in `migrate-to-opensearch.ts`:

```typescript
analyzer: {
  text_analyzer: {
    type: "custom",
    tokenizer: "standard",
    filter: ["lowercase", "stop", "snowball", "synonym_filter"]
  }
}
```

### Add Custom Fields

Extend the `SearchableItem` interface and update the indexing methods:

```typescript
interface SearchableItem {
  // ... existing fields
  customField?: string;
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Failed**

   - Check `OPENSEARCH_ENDPOINT` is correct
   - Verify network access and security groups
   - Ensure AWS credentials are valid

2. **Permission Denied**

   - Check IAM policies for OpenSearch access
   - Verify DynamoDB table permissions
   - Ensure region matches your resources

3. **Index Creation Failed**
   - Check if index already exists
   - Verify OpenSearch version compatibility
   - Check cluster health status

### Debug Mode

Enable detailed logging by setting:

```bash
DEBUG=opensearch npm run migrate:opensearch
```

## 📈 Performance Tips

1. **Bulk Indexing**: The script uses bulk operations for efficiency
2. **Batch Size**: Adjust bulk batch size based on your cluster capacity
3. **Refresh Policy**: Set `refresh: true` for immediate searchability
4. **Shard Count**: Adjust based on data size and cluster capacity

## 🔄 Incremental Updates

For ongoing data synchronization, you can:

1. **Track Last Updated**: Store timestamps in DynamoDB
2. **Delta Migration**: Only migrate changed records
3. **Scheduled Jobs**: Run migration periodically
4. **Real-time Sync**: Use DynamoDB Streams + Lambda

## 📚 Next Steps

After migration:

1. **Update Frontend**: Replace DynamoDB search with OpenSearch
2. **Add Search UI**: Implement autocomplete and filters
3. **Monitor Performance**: Track search response times
4. **Optimize Queries**: Fine-tune search relevance

## 🆘 Support

If you encounter issues:

1. Check the console output for error messages
2. Verify environment variables are set correctly
3. Test AWS credentials and permissions
4. Check OpenSearch cluster health
5. Review DynamoDB table structure

## 📝 Example Usage in Frontend

```typescript
// Replace your existing search with OpenSearch
const searchEvents = async (query: string) => {
  const response = await fetch("/api/opensearch/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      filters: { type: "event" },
      limit: 20,
    }),
  });

  return response.json();
};
```

This migration will give you enterprise-grade search capabilities that far exceed what DynamoDB can provide!
