import { getTotalVisitsByDay } from "@/lib/dynamodb/dynamodb-statistics";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "USER_VISIT";

    console.log(`Fetching visits by day for action: ${action}`);

    const visitsByDay = await getTotalVisitsByDay(action as any);

    return NextResponse.json({
      action,
      visitsByDay,
    });
  } catch (error) {
    console.error("Error fetching visits by day:", error);
    return NextResponse.json(
      { error: "Failed to fetch visits by day" },
      { status: 500 }
    );
  }
}
