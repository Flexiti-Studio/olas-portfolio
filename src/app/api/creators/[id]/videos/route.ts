import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { story } = body;

    if (!story) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let generatedName = "";
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant. Provide a very short title (max 5 words) for the following video story line. Output ONLY the title." },
          { role: "user", content: story }
        ],
        max_tokens: 20,
      });
      generatedName = response.choices[0]?.message?.content?.trim() || "";
      if (generatedName.startsWith('"') && generatedName.endsWith('"')) {
        generatedName = generatedName.slice(1, -1);
      }
    } catch (err) {
      console.error("Failed to generate title with AI", err);
      generatedName = story.split(' ').slice(0, 5).join(' ') + "...";
    }

    const project = await prisma.creatorProject.findUnique({
      where: { id: id }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const currentContents = (project.contents as any[]) || [];
    const newVideo = {
      id: `video-${Date.now()}`,
      title: generatedName,
      story: story,
      type: "VideoStory",
      status: "Planning",
      date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    };

    const updatedProject = await prisma.creatorProject.update({
      where: { id: id },
      data: {
        contents: [newVideo, ...currentContents]
      }
    });

    return NextResponse.json({ success: true, video: newVideo });
  } catch (error: any) {
    console.error("Error creating video:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
