import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextResponse } from "next/server";
import { Resource } from "sst";

export async function GET() {
  try {
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const categories = await db.getCategories();

    return NextResponse.json({
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
