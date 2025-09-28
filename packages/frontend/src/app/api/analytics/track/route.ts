import { sendToQueue } from "@/lib/queue";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Add message to batch (non-blocking)
  await sendToQueue(body);

  return NextResponse.json({ message: "Event tracked" });
}
