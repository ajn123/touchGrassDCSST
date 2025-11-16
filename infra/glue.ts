import * as aws from "@pulumi/aws";

// Create AWS Glue Connection for DynamoDB using Pulumi
// SST v3 is built on Pulumi, so we can use Pulumi resources directly
const test = new aws.glue.Connection("test", {
  name: "example",
  connectionType: "DYNAMODB",
  connectionProperties: {
    // Athena properties are set via connection properties
    "athena.lambda.function.arn":
      "arn:aws:lambda:us-east-1:123456789012:function:athenafederatedcatalog_athena_abcdefgh",
    "athena.disable.spill.encryption": "false",
    "athena.spill.bucket": "example-bucket",
  },
});

export { test as glueConnection };

