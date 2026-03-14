import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = Resource.Db.name;

async function cleanStaleImageUrls() {
  console.log(`Scanning table: ${tableName}`);

  let totalScanned = 0;
  let totalCleaned = 0;
  let lastKey: Record<string, any> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression:
          "attribute_exists(image_url) AND image_url <> :empty AND NOT begins_with(image_url, :http) AND NOT begins_with(image_url, :https) AND NOT begins_with(image_url, :data)",
        ExpressionAttributeValues: {
          ":empty": "",
          ":http": "http://",
          ":https": "https://",
          ":data": "data:",
        },
        ExclusiveStartKey: lastKey,
      })
    );

    totalScanned += result.ScannedCount ?? 0;

    if (result.Items) {
      for (const item of result.Items) {
        console.log(
          `  Cleaning: pk=${item.pk}, sk=${item.sk}, image_url="${item.image_url}"`
        );
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: item.pk, sk: item.sk },
            UpdateExpression: "SET image_url = :empty",
            ExpressionAttributeValues: { ":empty": "" },
          })
        );
        totalCleaned++;
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`\nDone. Scanned ${totalScanned} items, cleaned ${totalCleaned}.`);
}

cleanStaleImageUrls().catch(console.error);
