import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const { templateId } = await params;
    
    // Check if it's "new"
    if (templateId === "new") {
      return NextResponse.json({ template: null });
    }

    const template = await prisma.videoTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Error fetching template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const { templateId } = await params;
    const body = await req.json();
    const { name, description, data, version } = body;

    const updatedTemplate = await prisma.videoTemplate.update({
      where: { id: templateId },
      data: {
        name,
        description,
        data,
        version: { increment: 1 }
      }
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error: any) {
    console.error("Error updating template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const { templateId } = await params;
    await prisma.videoTemplate.delete({
      where: { id: templateId }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
