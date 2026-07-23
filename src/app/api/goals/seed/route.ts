import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.goal.deleteMany({}); // clear existing
    
    // Create dummy goals
    await prisma.goal.create({
      data: {
        title: "Launch Global SaaS Product",
        status: "active",
        order: 0,
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 2)), // Due in 2 months
        timeline: [
          { id: "1", text: "Finalize core architecture", completed: true },
          { id: "2", text: "Complete Stripe integration", completed: true },
          { id: "3", text: "Beta testing with 50 users", completed: false },
          { id: "4", text: "Official public launch", completed: false }
        ]
      }
    });

    await prisma.goal.create({
      data: {
        title: "Master Machine Learning",
        status: "active",
        order: 1,
        deadline: new Date(new Date().setDate(new Date().getDate() + 5)), // Due in 5 days
        timeline: [
          { id: "5", text: "Complete PyTorch fundamentals", completed: true },
          { id: "6", text: "Build a computer vision model", completed: false },
          { id: "7", text: "Deploy model to production", completed: false }
        ]
      }
    });

    await prisma.goal.create({
      data: {
        title: "Secure Senior Developer Role",
        status: "achieved",
        order: 2,
        timeline: [
          { id: "8", text: "Update resume and portfolio", completed: true },
          { id: "9", text: "Complete 100 LeetCode problems", completed: true },
          { id: "10", text: "Pass final technical interview", completed: true },
          { id: "11", text: "Sign offer letter", completed: true }
        ]
      }
    });

    return NextResponse.json({ success: true, message: "Seeded" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
