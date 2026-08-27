import { NextRequest, NextResponse } from "next/server";
import { getSQLiteDB } from "@/database/local/db";
import {
  updateSubcategoryDb,
  deleteSubcategoryDb,
} from "@/database/local/subcategoryQueries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getSQLiteDB();
    const res = updateSubcategoryDb(db, id, body.name, body.description);
    if (!res.success) {
      return NextResponse.json({ success: false, message: res.error }, { status: 400 });
    }
    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/subcategories/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getSQLiteDB();
    const res = deleteSubcategoryDb(db, id);
    if (!res.success) {
      return NextResponse.json({ success: false, message: res.error }, { status: 400 });
    }
    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/subcategories/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
