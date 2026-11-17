import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateLabEntrySchema } from "@/lib/lab/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const demoType = searchParams.get("demoType");
    const isPublic = searchParams.get("isPublic");

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (demoType) where.demoType = demoType;
    if (isPublic !== null && isPublic !== undefined) {
      if (isPublic === "true") where.isPublic = true;
      if (isPublic === "false") where.isPublic = false;
    }

    const entries = await prisma.labEntry.findMany({
      where,
      orderBy: [
        { featured: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error("Error fetching lab entries:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch lab entries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = CreateLabEntrySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check slug uniqueness
    const existing = await prisma.labEntry.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A lab entry with this slug already exists" },
        { status: 409 }
      );
    }

    // Default sortOrder to highest + 1 if not set
    let sortOrder = data.sortOrder;
    if (sortOrder === 0) {
      const highest = await prisma.labEntry.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (highest?.sortOrder ?? -1) + 1;
    }

    const entry = await prisma.labEntry.create({
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        demoType: data.demoType,
        notes: data.notes || null,
        whyItMatters: data.whyItMatters || null,
        config: data.config as any,
        status: data.status,
        isPublic: data.isPublic,
        featured: data.featured,
        sortOrder,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error("Error creating lab entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create lab entry" },
      { status: 500 }
    );
  }
}

