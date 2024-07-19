import { Resource } from "sst";
import { DynamoDBClient, ScanCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

export async function main() {
  console.log("Cleaning up all data...");
  
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  try {
    // Scan all items
    const scanCommand = new ScanCommand({
      TableName: Resource.Db.name,
    });
    
    const result = await client.send(scanCommand);
    const items = result.Items || [];
    
    console.log(`Found ${items.length} items to delete`);
    
    // Delete each item
    for (const item of items) {
      const deleteCommand = new DeleteItemCommand({
        TableName: Resource.Db.name,
        Key: {
          pk: item.pk,
          sk: item.sk
        }
      });
      
      await client.send(deleteCommand);
      console.log(`✅ Deleted item: ${item.pk?.S}`);
    }
    
    console.log("Cleanup complete!");
    
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

main().catch(console.error); 