import { openSearchClient } from "@/lib/opensearch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "ballst";

    console.log("🔍 Testing autocomplete for query:", query);

    // Test autocomplete
    const autocompleteResults = await openSearchClient.autocomplete(query, 10);

    return NextResponse.json({
      success: true,
      query,
      autocompleteResults: {
        total: autocompleteResults.length,
        results: autocompleteResults.map((item: any) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          category: item.category,
          _score: item._score,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Test autocomplete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
