import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { platform, name, description, body: templateBody, placeholders } = body;

    const template = await prisma.socialTemplate.update({
      where: { id },
      data: {
        platform,
        name,
        description,
        body: templateBody,
        placeholders: placeholders || []
      }
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Set this template as the primary one for its platform
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get the target template to know its platform
    const target = await prisma.socialTemplate.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    // Unset is_primary for all templates on that platform first
    await prisma.socialTemplate.updateMany({
      where: { platform: target.platform },
      data: { is_primary: false }
    });

    // Now set this one as primary
    const template = await prisma.socialTemplate.update({
      where: { id },
      data: { is_primary: true }
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.socialTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
