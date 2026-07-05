import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { jobUrl, screenshotUrl } = await req.json();

    const application = await prisma.taskApplication.update({
      where: { id },
      data: {
        job_url: jobUrl,
        screenshot_url: screenshotUrl
      }
    });

    return NextResponse.json(application);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
