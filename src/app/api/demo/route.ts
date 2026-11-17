import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const set = searchParams.get("set");

    const where: any = {
      isPublic: true,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (set === "featured") {
      where.featured = true;
    }

    const entries = await prisma.labEntry.findMany({
      where,
      orderBy: [
        { featured: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        demoType: true,
        whyItMatters: true,
        status: true,
        featured: true,
        sortOrder: true,
      },
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error("Error fetching public lab entries:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load public demos" },
      { status: 500 }
    );
  }
}

