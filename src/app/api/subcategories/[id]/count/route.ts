import { NextRequest, NextResponse } from "next/server";
import { getSQLiteDB } from "@/database/local/db";
import { countPromptsBySubcategoryDb } from "@/database/local/subcategoryQueries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getSQLiteDB();
    const count = countPromptsBySubcategoryDb(db, id);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("GET /api/subcategories/[id]/count error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
