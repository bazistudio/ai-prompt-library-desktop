import { NextRequest, NextResponse } from "next/server";
import { getSQLiteDB } from "@/database/local/db";
import {
  getAllSubcategoriesDb,
  createSubcategoryDb,
} from "@/database/local/subcategoryQueries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const db = getSQLiteDB();
    const subcategories = getAllSubcategoriesDb(db, categoryId);
    return NextResponse.json({ success: true, subcategories });
  } catch (error: any) {
    console.error("GET /api/subcategories error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getSQLiteDB();
    const res = createSubcategoryDb(db, body.categoryId, body.name, body.description);
    if (!res.success) {
      return NextResponse.json({ success: false, message: res.error }, { status: 400 });
    }
    return NextResponse.json(res, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/subcategories error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
