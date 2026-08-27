import { NextRequest, NextResponse } from "next/server";
import { getPromptById, deletePromptVersions } from "@/database/local/promptStore";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { versionIds } = body;

    if (!Array.isArray(versionIds) || versionIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "versionIds array is required." },
        { status: 400 }
      );
    }

    const result = deletePromptVersions(id, versionIds);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to delete versions." },
        { status: 400 }
      );
    }

    const updatedPrompt = getPromptById(id);
    return NextResponse.json({ success: true, updatedPrompt }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/desktop-prompts/[id]/versions error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
