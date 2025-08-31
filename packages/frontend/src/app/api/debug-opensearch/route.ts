import { openSearchClient } from "@/lib/opensearch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || undefined;

    console.log("🔍 Debug OpenSearch - Query:", query, "Type:", type);

    // Test basic search
    const basicSearch = await openSearchClient.search(query, { type });

    // Test search for groups specifically
    const groupSearch = await openSearchClient.search(query, { type: "group" });

    // Test search for events specifically
    const eventSearch = await openSearchClient.search(query, { type: "event" });

    // Test search without any filters
    const allSearch = await openSearchClient.search(query, {});

    return NextResponse.json({
      success: true,
      debug: {
        query,
        type,
        basicSearch: {
          total: basicSearch.total,
          hits: basicSearch.hits.length,
          types: basicSearch.hits.map((h: any) => h.type),
        },
        groupSearch: {
          total: groupSearch.total,
          hits: groupSearch.hits.length,
          groups: groupSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
          })),
        },
        eventSearch: {
          total: eventSearch.total,
          hits: eventSearch.hits.length,
          events: eventSearch.hits.map((h: any) => ({
            id: h.id,
            title: h.title,
            type: h.type,
          })),
        },
        allSearch: {
          total: allSearch.total,
          hits: allSearch.hits.length,
          types: allSearch.hits.map((h: any) => h.type),
        },
      },
    });
  } catch (error) {
    console.error("❌ Debug OpenSearch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
