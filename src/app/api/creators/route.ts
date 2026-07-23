import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await prisma.creatorProject.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error("Error fetching creator projects:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, client, creator, budget } = body;

    const newProject = await prisma.creatorProject.create({
      data: {
        name,
        client: client || "N/A",
        creator,
        budget: budget || "$0",
        status: "Planning"
      }
    });

    return NextResponse.json(newProject);
  } catch (error: any) {
    console.error("Error creating creator project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
