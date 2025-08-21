import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Resource } from "sst";

export function sendToQueue(body: any) {
  const sqs = new SQSClient({});
  sqs.send(
    new SendMessageCommand({
      QueueUrl: Resource.user_analytics.url,
      MessageBody: JSON.stringify(body),
    })
  );
}
