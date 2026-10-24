import { NextResponse, NextRequest } from "next/server";
import { completeTask } from "@/lib/focus/focus";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { done, title } = body;

    const dataToUpdate: any = {};
    if (title !== undefined && typeof title === "string") {
      dataToUpdate.title = title.trim();
    }

    if (done === true) {
      const result = await completeTask(id);
      if (dataToUpdate.title) {
        await prisma.task.update({
          where: { id },
          data: { title: dataToUpdate.title }
        });
      }
      return NextResponse.json({ success: true, data: result });
    } else if (done === false) {
      dataToUpdate.done = false;
      dataToUpdate.completedAt = null;
      const task = await prisma.task.update({
        where: { id },
        data: dataToUpdate
      });
      return NextResponse.json({ success: true, data: { task } });
    } else {
      const task = await prisma.task.update({
        where: { id },
        data: dataToUpdate
      });
      return NextResponse.json({ success: true, data: { task } });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Delete task (Subtasks cascade)
    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
