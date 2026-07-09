import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";

    const where = includeArchived ? {} : { status: { not: "ARCHIVED" } };
    
    const projects = await prisma.project.findMany({
      where,
      include: {
        tasks: { orderBy: { order: 'asc' } },
        _count: {
          select: { tasks: { where: { done: false } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const focusState = await prisma.focusState.findUnique({ where: { id: "singleton" } });
    const focusedProjectId = focusState?.focusedProjectId;

    return NextResponse.json({ success: true, data: { projects, focusedProjectId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, focusImmediately } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: { message: "Name is required" } }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: { name, description }
    });

    if (focusImmediately) {
      await prisma.focusState.upsert({
        where: { id: "singleton" },
        update: { focusedProjectId: project.id },
        create: { id: "singleton", focusedProjectId: project.id }
      });
    }

    return NextResponse.json({ success: true, data: { project } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
