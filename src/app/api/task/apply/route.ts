import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, cvContent, coverLetter } = await req.json();

    const application = await prisma.taskApplication.create({
      data: {
        job_description: jobDescription,
        cv_content: cvContent,
        cover_letter: coverLetter,
        status: "Applied"
      }
    });

    return NextResponse.json(application);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
