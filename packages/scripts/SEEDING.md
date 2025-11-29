# Database Seeding Guide

This guide explains how to seed your database with initial data (groups, events, and venues).

## Prerequisites

1. **SST Environment**: Make sure you're connected to the correct SST environment (dev or production)
2. **Data Files**: Ensure the following JSON files exist in the project root:
   - `groups.json` - Group data
   - `events.json` - Event data  
   - `venues.json` - Venue data

## Quick Start: Seed Everything

To seed all data types at once:

```bash
cd packages/scripts
npm run shell tsx src/seed-all.ts
```

Or using the npm script (if added):

```bash
cd packages/scripts
npm run seed:all
```

## Individual Seeding

### Seed Groups

Groups are seeded from `groups.json` and use Step Functions for processing:

```bash
cd packages/scripts
npm run shell tsx src/seed-groups.ts
```

Or:
```bash
npm run seed:groups
```

**What it does:**
- Reads `groups.json` from project root
- Checks for existing groups to avoid duplicates
- Uses Step Functions to:
  - Normalize groups (pass-through for groups)
  - Save to DynamoDB
  - Index to OpenSearch

**Group Structure:**
- Each group has a `GROUP_INFO` item with `pk = "GROUP#<title>"` and `sk = "GROUP_INFO"`
- Each schedule creates a `SCHEDULE#` item with the same `pk` but different `sk`

### Seed Events

Events are seeded from `events.json` and use Step Functions for processing:

```bash
cd packages/scripts
npm run shell tsx src/seed-data.ts
```

Or:
```bash
npm run seed:events
```

**What it does:**
- Reads `events.json` from project root
- Uses Step Functions to:
  - Normalize events
  - Save to DynamoDB
  - Index to OpenSearch

### Seed Venues

Venues are seeded from `venues.json` and are saved directly to DynamoDB:

```bash
cd packages/scripts
npm run shell tsx src/seed-venues.ts
```

Or:
```bash
npm run seed:venues
```

**What it does:**
- Reads `venues.json` from project root
- Checks for existing venues to avoid duplicates
- Saves directly to DynamoDB (no Step Functions)
- Each venue has a `VENUE_INFO` item with `pk = "VENUE#<title>"` and `sk = "VENUE_INFO"`
- Each schedule creates a `SCHEDULE#` item

## Production Seeding

To seed in production, make sure you're connected to the production SST environment:

```bash
# Set the stage to production
sst env set STAGE production

# Or use the --stage flag
cd packages/scripts
npm run shell -- --stage production tsx src/seed-all.ts
```

## Monitoring Seeding Progress

### Step Functions (Groups & Events)

Groups and events use Step Functions. Monitor progress:

1. **AWS Console**: Go to Step Functions → Find `normaizeEventStepFunction`
2. **Check Executions**: Look for executions with names like:
   - `seed-groups-<timestamp>-<random>`
   - `seed-data-<timestamp>-<random>`
3. **View Logs**: Click on an execution to see:
   - Normalize step output
   - DB insert step output
   - Reindex step output

### CloudWatch Logs

Check Lambda function logs:

1. **Groups/Events**: Check `addEventToDBFunction` logs
2. **Normalization**: Check `normalizeEventFunction` logs
3. **Reindexing**: Check `reindexEventsFunction` logs

### Direct Database Check

For venues (saved directly), check DynamoDB:

1. Go to DynamoDB → Your table
2. Query with:
   - `pk` begins with `VENUE#` for venues
   - `pk` begins with `GROUP#` for groups
   - `pk` begins with event IDs for events

## Troubleshooting

### Groups Not Persisting

If groups aren't being saved:

1. **Check Step Functions**: Verify the execution completed successfully
2. **Check Logs**: Look for errors in `addEventToDBFunction` logs
3. **Verify Payload**: Check that GROUP_INFO items have `sk = "GROUP_INFO"`
4. **Re-run**: Try seeding again (it will skip existing groups)

### Events Not Appearing

1. **Check Step Functions**: Verify normalization and DB insert steps succeeded
2. **Check OpenSearch**: Events should be indexed automatically
3. **Verify Data Format**: Ensure `events.json` has the correct structure

### Venues Not Saving

1. **Check DynamoDB**: Verify items are being created
2. **Check Permissions**: Ensure the script has DynamoDB write permissions
3. **Check Logs**: Look for error messages in the console output

## Data File Formats

### groups.json
```json
[
  {
    "title": "The Ballston Runaways",
    "description": "A running group...",
    "category": ["Sports", "Fitness"],
    "schedules": [
      {
        "days": ["Tuesday", "Thursday"],
        "recurrence_type": "weekly",
        "time": "6:15 AM",
        "location": "Compass Coffee, Ballston, VA"
      }
    ],
    "isPublic": true
  }
]
```

### events.json
```json
{
  "events": [
    {
      "title": "Event Name",
      "description": "Event description",
      "start_date": "2024-01-15",
      "start_time": "7:00 PM",
      "location": "Venue Name",
      "category": ["Music"],
      "is_public": true
    }
  ]
}
```

### venues.json
```json
[
  {
    "title": "Venue Name",
    "description": "Venue description",
    "category": ["Restaurant"],
    "location": "123 Main St, Washington, DC",
    "isPublic": true
  }
]
```

## Notes

- **Idempotency**: Groups and venues check for existing items and skip duplicates
- **Step Functions**: Groups and events use Step Functions for async processing
- **Direct Insert**: Venues are inserted directly (faster, but no async processing)
- **OpenSearch**: Groups and events are automatically indexed to OpenSearch
- **Venues**: Venues are NOT automatically indexed (you may need to do this separately)

