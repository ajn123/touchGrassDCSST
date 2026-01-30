import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";
import { task } from "sst/aws/task";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Manual DC Comedy Loft crawler trigger requested");
    // By default, 'await task.run(Resource.dccomedyloftTask)' only waits for the ECS task to be started (RUNNING),
    // and returns before your Docker container (crawler) finishes its work.
    //
    // To wait until the ECS task and Docker process actually complete, pass { sync: true }.
    // This makes 'task.run' wait until the container exits and the output can be captured.
    //
    // Example:
    const runRet = await task.run(Resource.dccomedyloftTask);

    return NextResponse.json({ ...runRet });
  } catch (error) {
    console.error("❌ Failed to trigger DC Comedy Loft crawler:", error);

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
