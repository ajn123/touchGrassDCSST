import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";
import { task } from "sst/aws/task";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Manual Kennedy Center crawler trigger requested");
    const runRet = await task.run(Resource.kennedycenterTask);

    return NextResponse.json({ ...runRet });
  } catch (error) {
    console.error("❌ Failed to trigger Kennedy Center crawler:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
