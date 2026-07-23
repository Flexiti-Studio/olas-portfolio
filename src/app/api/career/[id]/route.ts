import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const career = await prisma.career.findUnique({
      where: { id },
    });
    
    if (!career) {
      return NextResponse.json({ error: "Career not found" }, { status: 404 });
    }
    
    return NextResponse.json({ career });
  } catch (error) {
    console.error("Error fetching career:", error);
    return NextResponse.json(
      { error: "Failed to fetch career" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.career.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting career:", error);
    return NextResponse.json(
      { error: "Failed to delete career" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const career = await prisma.career.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        status: data.status,
        date: data.date,
        description: data.description,
        ...(data.skills && { skills: data.skills }),
        ...(data.timeline && { timeline: data.timeline }),
      },
    });
    return NextResponse.json({ career });
  } catch (error) {
    console.error("Error updating career:", error);
    return NextResponse.json(
      { error: "Failed to update career" },
      { status: 500 }
    );
  }
}
