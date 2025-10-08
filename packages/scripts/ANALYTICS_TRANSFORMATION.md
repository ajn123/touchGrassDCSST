# Analytics Data Transformation Script

This directory contains a one-off script to transform USER and SEARCH analytics data in DynamoDB from the current structure to a new primary key format.

## Overview

The script transforms USER_VISIT and SEARCH analytics records to use `ANALYTICS#(TYPE)` as the primary key instead of the current `ANALYTICS#${action}` format.

## Current vs Target Structure

### Before (Current)

```
pk: "ANALYTICS#USER_VISIT"
sk: "TIME#1234567890"
properties: { ... }
action: "USER_VISIT"
```

### After (Target)

```
pk: "ANALYTICS#USER_VISIT"  # Same format, but cleaner structure
sk: "TIME#1234567890"        # Preserved or regenerated
properties: { ... }
action: "USER_VISIT"
transformedAt: "2024-01-01T00:00:00.000Z"
```

## Usage

### Option 1: Using the runner script (Recommended)

```bash
# From project root
cd packages/scripts
./transform-analytics.js
```

### Option 2: Direct execution

```bash
# From project root
npx tsx packages/scripts/src/transform-analytics-data.ts
```

## Prerequisites

1. **SST Environment**: Make sure you have the SST environment loaded:

   ```bash
   npx sst env
   ```

2. **AWS Credentials**: Ensure your AWS credentials are configured

3. **Database Access**: The script needs read/write access to your DynamoDB table

## What the Script Does

1. **Scans** all analytics records with `pk` starting with `ANALYTICS#`
2. **Transforms** records to the new structure
3. **Saves** transformed records to DynamoDB
4. **Cleans up** original records (optional)
5. **Reports** progress and summary statistics

## Analytics Actions Processed

The script processes these analytics action types:

- `USER_VISIT`
- `SEARCH`

## Safety Features

- **Error Handling**: Continues processing even if individual records fail
- **Progress Logging**: Shows detailed progress and statistics
- **Validation**: Validates record format before transformation
- **Rollback Info**: Keeps track of original records for potential rollback

## Output Example

```
🚀 Starting analytics data transformation...
🔍 Scanning for analytics records...
📊 Found 150 records in this batch (total: 150)
✅ Scan complete. Found 150 analytics records total.
📋 Found 150 records to process.
🔄 Transforming records...
✅ Transformed 150 records.
💾 Saving transformed records...
💾 Processed 100 records...
🧹 Cleaning up original records...

📊 Transformation Summary:
✅ Successfully processed: 150 records
❌ Errors encountered: 0 records
🔄 Total records scanned: 150
✨ Transformation complete!
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**

   ```
   ❌ Missing required environment variables: AWS_REGION, SST_STAGE
   ```

   **Solution**: Run `npx sst env` to load SST environment

2. **Permission Denied**

   ```
   ❌ Error: AccessDeniedException
   ```

   **Solution**: Check AWS credentials and DynamoDB permissions

3. **Table Not Found**
   ```
   ❌ Error: ResourceNotFoundException
   ```
   **Solution**: Ensure SST stack is deployed and table exists

### Recovery

If the transformation fails partway through:

1. Check the error logs
2. Fix the underlying issue
3. Re-run the script (it will skip already processed records)

## Files

- `src/transform-analytics-data.ts` - Main transformation logic
- `transform-analytics.js` - Runner script with environment checks
- `README.md` - This documentation

## Notes

- This is a **one-off script** - run it once to migrate your data
- The script is **idempotent** - safe to run multiple times
- Original records are **deleted** after successful transformation
- Consider **backing up** your data before running the script
