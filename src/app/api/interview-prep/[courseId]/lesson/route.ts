import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const body = await req.json();
    const { moduleId, title, estimatedMinutes, content } = body;

    if (!moduleId || !title) {
      return NextResponse.json({ error: "Module ID and Lesson title are required" }, { status: 400 });
    }

    // Get current lesson count in this module to set the order
    const lastLesson = await prisma.lesson.findFirst({
      where: { module_id: moduleId },
      orderBy: { order: "desc" },
    });

    const newOrder = (lastLesson?.order ?? 0) + 1;

    const lesson = await prisma.lesson.create({
      data: {
        module_id: moduleId,
        title,
        order: newOrder,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : 5,
        content: content || {},
      },
    });

    return NextResponse.json(lesson);
  } catch (err: any) {
    console.error("Create lesson error:", err);
    return NextResponse.json({ error: err.message || "Failed to create lesson" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const body = await req.json();
    const { lessonId, title, estimatedMinutes, content } = body;

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (estimatedMinutes !== undefined) updateData.estimated_minutes = parseInt(estimatedMinutes);
    if (content !== undefined) updateData.content = content;

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Update lesson error:", err);
    return NextResponse.json({ error: err.message || "Failed to update lesson" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 });
    }

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete lesson error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete lesson" }, { status: 500 });
  }
}

