import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { sourceSocialId, originalContent, targetSocials, creatorName, creatorHandle, creatorImage } = body;

    if (!sourceSocialId || !originalContent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (creatorName || creatorHandle || creatorImage) {
      await prisma.creatorProject.update({
        where: { id: id },
        data: {
          ...(creatorName ? { creator: creatorName } : {}),
          ...(creatorHandle ? { creatorHandle } : {}),
          ...(creatorImage ? { creatorImage } : {})
        }
      });
    }

    let generatedName = "";
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant. Provide a very short title (max 5 words) for the following content. Output ONLY the title." },
          { role: "user", content: originalContent }
        ],
        max_tokens: 20,
      });
      generatedName = response.choices[0]?.message?.content?.trim() || "";
      if (generatedName.startsWith('"') && generatedName.endsWith('"')) {
        generatedName = generatedName.slice(1, -1);
      }
    } catch (err) {
      console.error("Failed to generate name with AI", err);
      generatedName = originalContent.split(' ').slice(0, 5).join(' ') + "...";
    }

    const post = await prisma.post.create({
      data: {
        creatorId: id,
        sourceSocialId,
        originalContent,
        name: generatedName,
        versions: {
          create: (targetSocials || []).map((socialId: string) => ({
            socialId,
            status: "pending",
            content: "[]",
          }))
        }
      }
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
