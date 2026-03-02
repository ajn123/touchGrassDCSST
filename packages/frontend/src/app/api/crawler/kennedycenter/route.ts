import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Kennedy Center crawler task is not configured",
      timestamp: new Date().toISOString(),
    },
    { status: 501 }
  );
}
