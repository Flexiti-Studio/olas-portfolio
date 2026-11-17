import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ReorderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid reorder payload", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    await prisma.$transaction(
      items.map((item) =>
        prisma.labEntry.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true, count: items.length });
  } catch (error: any) {
    console.error("Error reordering lab entries:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reorder entries" },
      { status: 500 }
    );
  }
}

