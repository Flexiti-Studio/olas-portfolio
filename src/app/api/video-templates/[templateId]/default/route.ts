import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const { templateId } = await params;
    
    // First, set all other templates to not default
    await prisma.videoTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });

    // Set the requested template to default
    const updatedTemplate = await prisma.videoTemplate.update({
      where: { id: templateId },
      data: { isDefault: true }
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error: any) {
    console.error("Error setting default template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
