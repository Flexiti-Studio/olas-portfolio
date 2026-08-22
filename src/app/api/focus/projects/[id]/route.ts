import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, status } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;

    const project = await prisma.project.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true, data: { project } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // First delete all tasks associated with this project 
    // (Subtasks will be cascade deleted because of onDelete: Cascade on the Subtask model)
    await prisma.task.deleteMany({
      where: { projectId: id }
    });

    // Then delete the project itself
    await prisma.project.delete({
      where: { id }
    });

    // If this was the focused project, unset it
    const focusState = await prisma.focusState.findUnique({ where: { id: "singleton" } });
    if (focusState?.focusedProjectId === id) {
      await prisma.focusState.update({
        where: { id: "singleton" },
        data: { focusedProjectId: null }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

