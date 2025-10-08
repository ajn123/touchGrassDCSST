import {
  getTotalVisits,
  getTotalVisitsByDay,
} from "@/lib/dynamodb/dynamodb-statistics";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "USER_VISIT";

    console.log(`Fetching total visits for action: ${action}`);

    const visits = await getTotalVisits(action as any);

    const visitsByDay = await getTotalVisitsByDay(action as any);

    return NextResponse.json({
      action,
      totalVisits: visits?.length || 0,
      visits: visits || [],
      visitsByDay: visitsByDay || {},
    });
  } catch (error) {
    console.error("Error fetching total visits:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
