import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = Resource.Db.name;

const NINETY_DAYS_S = 90 * 24 * 60 * 60;

async function backfillTtl() {
  console.log(`Backfilling TTL on analytics records in: ${tableName}`);

  const analyticsTypes = [
    "ANALYTICS#USER_VISIT",
    "ANALYTICS#USER_ACTION",
    "ANALYTICS#EMAIL_SIGNUP",
    "ANALYTICS#SEARCH",
    "ANALYTICS#EVENT_PAGE_VISIT",
    "ANALYTICS#CONTACT_FORM_SUBMISSION",
    "ANALYTICS#EMAIL_SIGNUP_SUBMISSION",
    "ANALYTICS#CATEGORY_SELECTION",
    "ANALYTICS#CONTACT_FORM",
  ];

  let totalUpdated = 0;

  for (const pk of analyticsTypes) {
    let lastKey: Record<string, any> | undefined;
    let count = 0;

    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "pk = :pk",
          FilterExpression: "attribute_not_exists(#ttl)",
          ExpressionAttributeValues: { ":pk": pk },
          ExpressionAttributeNames: { "#ttl": "ttl" },
          ExclusiveStartKey: lastKey,
          Limit: 100,
        })
      );

      if (result.Items) {
        for (const item of result.Items) {
          // Extract timestamp from sk (TIME#<ms>)
          const ms = parseInt((item.sk as string).replace("TIME#", ""));
          const createdAtS = Math.floor(ms / 1000);
          const ttl = createdAtS + NINETY_DAYS_S;

          await docClient.send(
            new UpdateCommand({
              TableName: tableName,
              Key: { pk: item.pk, sk: item.sk },
              UpdateExpression: "SET #ttl = :ttl",
              ExpressionAttributeNames: { "#ttl": "ttl" },
              ExpressionAttributeValues: { ":ttl": ttl },
            })
          );
          count++;
        }
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    if (count > 0) {
      console.log(`  ${pk}: ${count} records updated`);
      totalUpdated += count;
    }
  }

  console.log(`\nDone. Updated ${totalUpdated} analytics records with TTL.`);
}

backfillTtl().catch(console.error);
