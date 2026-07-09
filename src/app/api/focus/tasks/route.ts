import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { projectId, title, order } = body;

    if (!projectId) {
      const focusState = await prisma.focusState.findUnique({ where: { id: "singleton" } });
      projectId = focusState?.focusedProjectId;
    }

    if (!projectId || !title) {
      return NextResponse.json({ success: false, error: { message: "projectId and title are required" } }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        order: order || 0
      }
    });

    return NextResponse.json({ success: true, data: { task } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
