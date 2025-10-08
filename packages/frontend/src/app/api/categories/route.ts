import { getCategories } from "@/lib/dynamodb/dynamodb-events";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await getCategories();
    console.log("📋 Retrieved categories:", categories);

    return NextResponse.json({
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
