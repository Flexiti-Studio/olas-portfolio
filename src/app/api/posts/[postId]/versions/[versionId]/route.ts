import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { versionId } = resolvedParams;
    const body = await req.json();
    const { content, imagePrompt, imageUrl } = body;

    const updateData: any = { content, isEdited: true };
    if (imagePrompt !== undefined) updateData.imagePrompt = imagePrompt;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const version = await prisma.postVersion.update({
      where: { id: versionId },
      data: updateData
    });

    return NextResponse.json({ success: true, version });
  } catch (error: any) {
    console.error("Error updating version:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
