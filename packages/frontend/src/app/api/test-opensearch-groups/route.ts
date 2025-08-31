import { openSearchClient } from "@/lib/opensearch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Testing OpenSearch groups...");

    // Test 1: Search for "ballston" specifically
    const ballstonSearch = await openSearchClient.search("ballston", { type: "group" });
    
    // Test 2: Search for "ballst" (partial)
    const ballstSearch = await openSearchClient.search("ballst", { type: "group" });
    
    // Test 3: Search for "runaways"
    const runawaysSearch = await openSearchClient.search("runaways", { type: "group" });
    
    // Test 4: Search for "running" (category)
    const runningSearch = await openSearchClient.search("running", { type: "group" });
    
    // Test 5: Get all groups (no query)
    const allGroupsSearch = await openSearchClient.search("", { type: "group" });

    // Test 6: Search without type filter to see what's in the index
    const allItemsSearch = await openSearchClient.search("", {});

    return NextResponse.json({
      success: true,
      tests: {
        ballstonSearch: {
          total: ballstonSearch.total,
          hits: ballstonSearch.hits.length,
          groups: ballstonSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
            category: h.category,
          })),
        },
        ballstSearch: {
          total: ballstSearch.total,
          hits: ballstSearch.hits.length,
          groups: ballstSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
            category: h.category,
          })),
        },
        runawaysSearch: {
          total: runawaysSearch.total,
          hits: runawaysSearch.hits.length,
          groups: runawaysSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
            category: h.category,
          })),
        },
        runningSearch: {
          total: runningSearch.total,
          hits: runningSearch.hits.length,
          groups: runningSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
            category: h.category,
          })),
        },
        allGroupsSearch: {
          total: allGroupsSearch.total,
          hits: allGroupsSearch.hits.length,
          groups: allGroupsSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
            category: h.category,
          })),
        },
        allItemsSearch: {
          total: allItemsSearch.total,
          hits: allItemsSearch.hits.length,
          items: allItemsSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
          })),
        },
      },
    });
  } catch (error) {
    console.error("❌ Test OpenSearch groups error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
