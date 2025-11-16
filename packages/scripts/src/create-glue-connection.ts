import {
  GlueClient,
  CreateConnectionCommand,
  UpdateConnectionCommand,
} from "@aws-sdk/client-glue";

/**
 * Script to create an AWS Glue Connection for DynamoDB
 * This is equivalent to the Pulumi code:
 *
 * const test = new aws.glue.Connection("test", {
 *   name: "example",
 *   connectionType: "DYNAMODB",
 *   athenaProperties: {
 *     lambda_function_arn: "arn:aws:lambda:us-east-1:123456789012:function:athenafederatedcatalog_athena_abcdefgh",
 *     disable_spill_encryption: "false",
 *     spill_bucket: "example-bucket",
 *   },
 * });
 *
 * Usage:
 *   npm run create:glue-connection
 *   Or: tsx src/create-glue-connection.ts
 */

const client = new GlueClient({
  region: process.env.AWS_REGION || "us-east-1",
});

interface GlueConnectionConfig {
  name?: string;
  connectionType?: string;
  lambdaFunctionArn?: string;
  disableSpillEncryption?: string;
  spillBucket?: string;
}

async function createGlueConnection(config: GlueConnectionConfig = {}) {
  const connectionName = config.name || "example";
  const connectionType = config.connectionType || "DYNAMODB";
  const lambdaFunctionArn =
    config.lambdaFunctionArn ||
    "arn:aws:lambda:us-east-1:123456789012:function:athenafederatedcatalog_athena_abcdefgh";
  const disableSpillEncryption = config.disableSpillEncryption || "false";
  const spillBucket = config.spillBucket || "example-bucket";

  try {
    console.log("🔧 Creating AWS Glue Connection...");
    console.log(`   Name: ${connectionName}`);
    console.log(`   Type: ${connectionType}`);

    // Create the connection
    const createCommand = new CreateConnectionCommand({
      ConnectionInput: {
        Name: connectionName,
        ConnectionType: connectionType,
        ConnectionProperties: {},
      },
    });

    try {
      const createResponse = await client.send(createCommand);
      console.log("✅ Glue Connection created successfully");
    } catch (createError: any) {
      if (createError.name === "AlreadyExistsException") {
        console.log("ℹ️  Glue Connection already exists, updating...");
      } else {
        throw createError;
      }
    }

    // Update with Athena properties
    console.log("🔧 Setting Athena properties...");
    const updateCommand = new UpdateConnectionCommand({
      Name: connectionName,
      ConnectionInput: {
        Name: connectionName,
        ConnectionType: connectionType,
        ConnectionProperties: {
          // Athena-specific properties are set via connection properties
          "athena.lambda.function.arn": lambdaFunctionArn,
          "athena.disable.spill.encryption": disableSpillEncryption,
          "athena.spill.bucket": spillBucket,
        },
      },
    });

    await client.send(updateCommand);
    console.log("✅ Athena properties configured successfully");
    console.log(`   Lambda Function ARN: ${lambdaFunctionArn}`);
    console.log(`   Spill Bucket: ${spillBucket}`);
    console.log(`   Disable Spill Encryption: ${disableSpillEncryption}`);
  } catch (error: any) {
    console.error("❌ Error managing Glue Connection:", error);
    throw error;
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  // Parse command line arguments if provided
  const args = process.argv.slice(2);
  const config: GlueConnectionConfig = {};

  // Simple argument parsing
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace("--", "");
    const value = args[i + 1];
    if (key && value) {
      (config as any)[key] = value;
    }
  }

  createGlueConnection(config)
    .then(() => {
      console.log("\n✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

export { createGlueConnection };

