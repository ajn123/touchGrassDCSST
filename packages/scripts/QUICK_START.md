# 🚀 OpenSearch Migration - Quick Start

## 1. Install Dependencies

```bash
cd packages/scripts
npm install
```

## 2. Set Environment Variables

Create a `.env` file in the `packages/scripts` directory:

```bash
# Required - Your OpenSearch endpoint
OPENSEARCH_ENDPOINT=https://your-domain.us-east-1.es.amazonaws.com

# Required - AWS region
AWS_REGION=us-east-1

# Optional - OpenSearch credentials (if not using AWS IAM)
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin

# Optional - Index name
OPENSEARCH_INDEX_NAME=touchgrass-search
```

## 3. Test Connection

Before running the full migration, test your OpenSearch connection:

```bash
npm run test:opensearch
```

This will:

- ✅ Test OpenSearch connectivity
- ✅ Verify credentials
- ✅ Test index creation
- ✅ Test search functionality

## 4. Run Migration

If the test passes, run the full migration:

```bash
# Basic migration
npm run migrate:opensearch

# Recreate index (if needed)
npm run migrate:opensearch:recreate
```

## 5. What Happens

The migration will:

1. 🔧 Create an optimized search index
2. 📅 Migrate all DynamoDB events
3. 👥 Migrate all DynamoDB groups
4. 🔍 Test search functionality
5. 📊 Show migration statistics

## 🆘 Common Issues

### Connection Failed

- Check `OPENSEARCH_ENDPOINT` is correct
- Verify network access and security groups
- Ensure credentials are valid

### Permission Denied

- Check IAM policies for OpenSearch access
- Verify DynamoDB table permissions
- Ensure region matches your resources

## 🔍 Test Search

After migration, test the search:

```bash
# Test basic search
curl -X POST "https://your-domain.us-east-1.es.amazonaws.com/touchgrass-search/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "multi_match": {
        "query": "running",
        "fields": ["title^3", "description^2", "category^2"]
      }
    }
  }'
```

## 📚 Next Steps

1. **Update Frontend**: Replace DynamoDB search with OpenSearch
2. **Add Autocomplete**: Implement search suggestions
3. **Add Filters**: Category, date, location filtering
4. **Monitor Performance**: Track search response times

## 🎯 Expected Results

- **Search Speed**: 10-100x faster than DynamoDB
- **Fuzzy Matching**: "runnig" finds "running"
- **Relevance**: Better result ranking
- **Scalability**: Handle millions of documents

## 🆘 Need Help?

1. Check console output for error messages
2. Verify environment variables are set correctly
3. Test AWS credentials and permissions
4. Check OpenSearch cluster health
5. Review the full documentation in `OPENSEARCH_MIGRATION.md`

---

**Ready to migrate?** Start with step 1 and test your connection first!
