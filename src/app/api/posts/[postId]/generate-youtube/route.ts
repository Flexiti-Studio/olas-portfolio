import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { postId } = resolvedParams;
    const { step, generatedResults, imageResult } = await req.json();

    if (!step) {
      return NextResponse.json({ error: "Missing step" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { versions: true }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const template = await prisma.socialTemplate.findFirst({
      where: { platform: "youtube", is_primary: true }
    });

    if (step === "save") {
      const existingVersion = post.versions?.find((v: any) => v.socialId === "youtube");
      
      if (existingVersion) {
        await prisma.postVersion.update({
          where: { id: existingVersion.id },
          data: {
            content: generatedResults,
            imagePrompt: imageResult,
            status: "ready"
          }
        });
      } else {
        await prisma.postVersion.create({
          data: {
            postId: post.id,
            socialId: "youtube",
            content: generatedResults,
            imagePrompt: imageResult,
            status: "ready",
            templateId: template?.id
          }
        });
      }
      return NextResponse.json({ success: true });
    }



    let ytTemplates: any = {};
    if (template && template.body) {
      try {
        ytTemplates = JSON.parse(template.body);
      } catch (e) {}
    }

    const originalContent = post.originalContent;
    let result = "";
    let templateData = "";

    if (step === "script") templateData = ytTemplates.script || "";
    if (step === "sceneBreakdown") templateData = ytTemplates.sceneBreakdown || "";
    if (step === "voicePrompt") templateData = ytTemplates.voicePrompt || "";
    if (step === "videoPrompt") templateData = ytTemplates.videoPrompt || "";
    if (step === "imagePrompt") templateData = template?.imagePromptTemplate || "";

    switch (step) {
      case "script":
        const scriptPrompt = `You are a world-class YouTube scriptwriter.
Rewrite the original post into a YouTube script following this exact structure:
${templateData}
Return ONLY the final ready-to-use script text.`;
        const scriptRes = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: scriptPrompt },
            { role: "user", content: `ORIGINAL POST:\n"""\n${originalContent}\n"""` }
          ],
        });
        result = scriptRes.choices[0]?.message?.content || "";
        break;

      case "sceneBreakdown":
        const scenePrompt = `You are a scene breakdown director. Given a template for scene breakdown and a sample post/script, generate the exact scene breakdown for this content.
TEMPLATE:
${templateData}
Fill in any {{placeholders}} using content from the post provided. Return only the final ready-to-use scene breakdown.`;
        const sceneRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: scenePrompt },
            { role: "user", content: `ORIGINAL POST:\n"""\n${originalContent}\n"""` }
          ],
          temperature: 0.6,
        });
        result = sceneRes.choices[0]?.message?.content || "";
        break;

      case "voicePrompt":
        const voicePrompt = `You are a voice narration director. Given a template for voice/TTS generation instructions and a sample post/script, generate the exact voice direction prompt for this content.
TEMPLATE:
${templateData}
Fill in any {{placeholders}} using content from the post provided. Return only the final ready-to-use voice prompt.`;
        const voiceRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: voicePrompt },
            { role: "user", content: `ORIGINAL POST:\n"""\n${originalContent}\n"""` }
          ],
          temperature: 0.6,
        });
        result = voiceRes.choices[0]?.message?.content || "";
        break;

      case "videoPrompt":
        const videoPrompt = `You are a video prompt engineer. Given a template for AI video generation and a sample post/script, produce the exact video generation prompt for this content.
TEMPLATE:
${templateData}
Fill in any {{placeholders}} using content from the post provided. Return only the final ready-to-use video prompt.`;
        const videoRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: videoPrompt },
            { role: "user", content: `ORIGINAL POST:\n"""\n${originalContent}\n"""` }
          ],
          temperature: 0.6,
        });
        result = videoRes.choices[0]?.message?.content || "";
        break;

      case "imagePrompt":
        const imagePrompt = `You are an Image Prompt Engineer. Your job is to turn a social media post into a single, ready-to-use image generation prompt by following a reference TEMPLATE.
STEP 1: STUDY THE TEMPLATE
STEP 2: ANALYZE THE POST
STEP 3: FILL THE TEMPLATE
STEP 4: QUALITY CHECK
OUTPUT RULES: Output ONLY the final image prompt as plain text. No preamble.
TEMPLATE:
${templateData}`;
        const imageRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: imagePrompt },
            { role: "user", content: `ORIGINAL POST:\n"""\n${originalContent}\n"""` }
          ],
          temperature: 0.7,
        });
        result = imageRes.choices[0]?.message?.content || "";
        break;
        
      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error generating youtube step:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
