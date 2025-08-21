import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export async function POST(request: NextRequest) {
  const body = await request.json();

  console.log("TRACKING EVENT", body);

  const sqs = new SQSClient({});
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: Resource.user_analytics.url,
      MessageBody: JSON.stringify(body),
    })
  );

  return NextResponse.json({ message: "Event tracked" });
}
