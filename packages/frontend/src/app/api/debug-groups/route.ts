import { getGroups, searchGroups } from "@/lib/dynamodb-groups";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    console.log("🔍 Debug groups API called with query:", query);

    // Test 1: Get all groups
    console.log("🧪 Test 1: Getting all groups...");
    const allGroups = await getGroups();
    console.log("✅ All groups count:", allGroups.length);
    if (allGroups.length > 0) {
      console.log("🔍 First group:", allGroups[0]);
    }

    // Test 2: Search groups with query
    console.log("🧪 Test 2: Searching groups with query:", query);
    const searchResults = await searchGroups({
      query: query,
      limit: 10,
    });
    console.log("✅ Search results count:", searchResults.length);
    if (searchResults.length > 0) {
      console.log("🔍 First search result:", searchResults[0]);
    }

    // Test 3: Search groups with no query (should return all)
    console.log("🧪 Test 3: Searching groups with no query...");
    const noQueryResults = await searchGroups({
      limit: 10,
    });
    console.log("✅ No query results count:", noQueryResults.length);

    return NextResponse.json({
      success: true,
      debug: {
        allGroupsCount: allGroups.length,
        searchResultsCount: searchResults.length,
        noQueryResultsCount: noQueryResults.length,
        sampleGroup: allGroups[0] || null,
        sampleSearchResult: searchResults[0] || null,
        query: query,
      },
    });
  } catch (error) {
    console.error("❌ Error in debug groups API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
