import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateLabEntrySchema } from "@/lib/lab/schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const entry = await prisma.labEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Lab entry not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error("Error fetching lab entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch lab entry" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.labEntry.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lab entry not found" }, { status: 404 });
    }

    const validation = UpdateLabEntrySchema.safeParse({
      ...body,
      demoType: body.demoType || existing.demoType,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const slugClash = await prisma.labEntry.findUnique({
        where: { slug: data.slug },
      });
      if (slugClash) {
        return NextResponse.json(
          { error: "Another lab entry with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.labEntry.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.demoType !== undefined && { demoType: data.demoType }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.whyItMatters !== undefined && { whyItMatters: data.whyItMatters }),
        ...(data.config !== undefined && { config: data.config as any }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.featured !== undefined && { featured: data.featured }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating lab entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update lab entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await prisma.labEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lab entry not found" }, { status: 404 });
    }

    await prisma.labEntry.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting lab entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete lab entry" },
      { status: 500 }
    );
  }
}

