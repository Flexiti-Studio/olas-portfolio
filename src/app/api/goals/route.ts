import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" }
      ],
    });
    return NextResponse.json({ success: true, data: goals });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        status: "active",
        deadline: data.deadline ? new Date(data.deadline) : null,
        timeline: [],
      },
    });
    return NextResponse.json({ success: true, data: goal });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ success: false, error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { updates } = data; // Array of { id, order }

    // To avoid Postgres deadlocks when multiple transactions update rows,
    // acquire locks in a consistent order and run updates sequentially inside
    // a single transaction callback using the transaction client `tx`.
    const sorted = [...updates].sort((a: any, b: any) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));

    await prisma.$transaction(async (tx) => {
      for (const u of sorted) {
        await tx.goal.update({ where: { id: u.id }, data: { order: u.order } });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering goals:", error);
    return NextResponse.json({ success: false, error: "Failed to reorder goals" }, { status: 500 });
  }
}
