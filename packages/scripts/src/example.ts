import { Resource } from "sst";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

// This script runs in your SST environment
export async function main() {
  console.log("Running SST script...");
  
  // Access your SST resources
  console.log("Database name:", Resource.Db.name);
  
  // Example: Query your DynamoDB table
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
    });
    
    const result = await client.send(command);
    console.log("Found", result.Items?.length || 0, "items in database");
    
    // Process the data
    result.Items?.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        id: item.pk?.S,
        name: item.eventName?.S,
        date: item.eventDate?.S,
      });
    });
    
  } catch (error) {
    console.error("Error querying database:", error);
  }
}

// Run the script
main().catch(console.error);
