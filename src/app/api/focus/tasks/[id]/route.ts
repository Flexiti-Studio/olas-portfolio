import { NextResponse, NextRequest } from "next/server";
import { completeTask } from "@/lib/focus/focus";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { done } = body;

    if (done === true) {
      const result = await completeTask(id);
      return NextResponse.json({ success: true, data: result });
    } else {
      const task = await prisma.task.update({
        where: { id },
        data: { done: false, completedAt: null }
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
