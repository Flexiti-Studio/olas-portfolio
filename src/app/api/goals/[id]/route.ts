import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await request.json();

    const updateData: any = {};
    if (Object.prototype.hasOwnProperty.call(data, "title"))
      updateData.title = data.title;
    if (Object.prototype.hasOwnProperty.call(data, "status"))
      updateData.status = data.status;
    if (Object.prototype.hasOwnProperty.call(data, "timeline"))
      updateData.timeline = data.timeline;
    if (Object.prototype.hasOwnProperty.call(data, "deadline")) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ success: true, data: goal });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update goal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.goal.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete goal" },
      { status: 500 },
    );
  }
}
