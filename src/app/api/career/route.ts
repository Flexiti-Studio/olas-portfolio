import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const careers = await prisma.career.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ careers });
  } catch (error) {
    console.error("Error fetching careers:", error);
    return NextResponse.json(
      { error: "Failed to fetch careers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const career = await prisma.career.create({
      data: {
        title: data.title,
        category: data.category,
        status: data.status,
        date: data.date,
        description: data.description,
      },
    });
    return NextResponse.json({ career });
  } catch (error) {
    console.error("Error creating career:", error);
    return NextResponse.json(
      { error: "Failed to create career" },
      { status: 500 }
    );
  }
}
