import { getPublicGroups } from "@/lib/dynamodb/dynamodb-groups";
import { NextResponse } from "next/server";

/**
 * GET /api/groups/all
 * Returns all public groups from DynamoDB
 */
export async function GET() {
  try {
    const groups = await getPublicGroups();
    return NextResponse.json({ groups, count: groups.length });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 },
    );
  }
}
