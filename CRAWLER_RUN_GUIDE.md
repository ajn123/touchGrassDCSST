# How to Run Crawlers in Production

This guide explains how to run the DC Improv and DC Comedy Loft crawlers in production to populate events.

## Quick Start - Run Locally

You can run the crawlers directly from your console:

### Development/Default Stage
```bash
# DC Improv crawler (uses default SST stage)
npm run crawl:dcimprov

# DC Comedy Loft crawler (uses default SST stage)
npm run crawl:dccomedyloft
```

### Production Stage
```bash
# DC Improv crawler in production
npm run crawl:dcimprov:prod

# DC Comedy Loft crawler in production
npm run crawl:dccomedyloft:prod
```

**Note**: Make sure you have:
- AWS credentials configured (for Step Functions access)
- SST environment set up
- Playwright installed: `npx playwright install chromium`

The crawlers will:
- Extract events from the websites
- Save them via Step Functions to DynamoDB
- Use the correct SST stage (dev or production) based on the command
- Access the correct resources (Step Functions, DynamoDB) for that stage

**Important**: The `:prod` versions explicitly target production. Without it, they use your default SST stage (usually dev).

## Automatic Schedule

The crawlers run automatically on a schedule:

- **DC Improv**: Every 7 days (`rate(7 days)`)
- **DC Comedy Loft**: Every 7 days (`rate(7 days)`)

These schedules are configured in `infra/cron.ts` and run automatically via AWS EventBridge.

## Manual Triggering Methods

### Method 1: Via API Routes (Recommended)

You can manually trigger the crawlers by making POST requests to the API routes:

#### DC Improv Crawler
```bash
curl -X POST https://touchgrassdc.com/api/crawler/dcimprov
```

#### DC Comedy Loft Crawler
```bash
curl -X POST https://touchgrassdc.com/api/crawler/dccomedyloft
```

**Note**: These API routes require authentication if your admin routes are protected. You may need to:
1. Add authentication checks to these routes
2. Or use AWS CLI/Console methods below

### Method 2: Using AWS CLI

You can trigger the ECS tasks directly using AWS CLI:

#### Get the Task ARN
First, find your task ARN from SST resources:
```bash
# After running `sst deploy`, the task ARNs are available in Resource
# You can also find them in AWS Console or via:
aws ecs list-task-definitions --family-prefix touchgrassdcsst-production-dcimprovTask
aws ecs list-task-definitions --family-prefix touchgrassdcsst-production-dccomedyloftTask
```

#### Run the Task
```bash
# DC Improv
aws ecs run-task \
  --cluster touchgrassdcsst-production-Cluster-xxxxx \
  --task-definition touchgrassdcsst-production-dcimprovTask \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

# DC Comedy Loft
aws ecs run-task \
  --cluster touchgrassdcsst-production-Cluster-xxxxx \
  --task-definition touchgrassdcsst-production-dccomedyloftTask \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Method 3: Using AWS Console

1. Go to AWS ECS Console
2. Select your cluster (e.g., `touchgrassdcsst-production-Cluster-xxxxx`)
3. Go to "Task Definitions"
4. Find `touchgrassdcsst-production-dcimprovTask` or `touchgrassdcsst-production-dccomedyloftTask`
5. Click "Run new task"
6. Select your cluster and VPC configuration
7. Click "Run Task"

### Method 4: Using SST Console (if available)

If you have SST Console access:
```bash
sst console
# Navigate to Tasks section and trigger manually
```

## Monitoring Crawler Execution

### Check CloudWatch Logs

The crawlers log to CloudWatch. To view logs:

```bash
# DC Improv logs
aws logs tail /aws/ecs/touchgrassdcsst-production-dcimprovTask --follow

# DC Comedy Loft logs
aws logs tail /aws/ecs/touchgrassdcsst-production-dccomedyloftTask --follow
```

### Check ECS Task Status

```bash
# List running tasks
aws ecs list-tasks --cluster touchgrassdcsst-production-Cluster-xxxxx

# Describe a specific task
aws ecs describe-tasks \
  --cluster touchgrassdcsst-production-Cluster-xxxxx \
  --tasks <task-arn>
```

### Check Step Functions Executions

The crawlers trigger Step Functions to normalize and save events. Check executions:

```bash
# List recent executions
aws stepfunctions list-executions \
  --state-machine-arn <state-machine-arn> \
  --max-results 10
```

## What Happens When a Crawler Runs

1. **Crawling**: The crawler visits the target website and extracts event information
2. **Parsing**: Events are parsed and validated (skips events without titles)
3. **Limiting**: Only the first 50 events are kept
4. **Batching**: If payload exceeds 256KB, events are split into batches
5. **Step Functions**: Events are sent to Step Functions for normalization
6. **Database**: Normalized events are saved to DynamoDB

## Troubleshooting

### Crawler Not Running

1. Check cron job status in AWS EventBridge
2. Verify ECS task definition exists
3. Check CloudWatch logs for errors
4. Verify VPC and security group configuration

### Events Not Appearing

1. Check Step Functions executions for errors
2. Verify DynamoDB table permissions
3. Check normalization Lambda logs
4. Verify events meet filtering criteria (comedy category, future dates)

### Payload Size Errors

The crawlers automatically batch events if they exceed 256KB. If you see errors:
1. Check logs for batching messages
2. Verify events are being split correctly
3. Check Step Functions execution logs

## Adding Authentication to API Routes

If you want to protect the manual trigger API routes, add authentication:

```typescript
// In route.ts
import { getServerSession } from "next-auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of the code
}
```

## Best Practices

1. **Monitor regularly**: Check CloudWatch logs weekly
2. **Test after changes**: Run crawlers manually after code changes
3. **Check event quality**: Verify extracted events in the database
4. **Respect rate limits**: Don't trigger too frequently to avoid overwhelming target sites
5. **Keep logs**: Review logs periodically to catch parsing issues early
