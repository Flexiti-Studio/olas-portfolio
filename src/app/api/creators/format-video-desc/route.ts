import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { description, platform } = await req.json();
    if (!description || !platform) {
      return NextResponse.json({ error: "Missing description or platform" }, { status: 400 });
    }

    // 1. Fetch primary template for this platform (if any)
    let templatePlatform = platform.toLowerCase();
    if (templatePlatform === "ig" || templatePlatform === "ig_image" || templatePlatform === "instagram") {
      templatePlatform = "instagram";
    } else if (templatePlatform === "yt" || templatePlatform === "yt_video" || templatePlatform === "youtube") {
      templatePlatform = "youtube";
    } else if (templatePlatform === "tk" || templatePlatform === "tiktok") {
      templatePlatform = "tiktok";
    } else if (templatePlatform === "x" || templatePlatform === "twitter") {
      templatePlatform = "twitter";
    } else if (templatePlatform === "in" || templatePlatform === "linkedin") {
      templatePlatform = "linkedin";
    }

    const primaryTemplate = await prisma.socialTemplate.findFirst({
      where: {
        platform: templatePlatform,
        is_primary: true
      }
    });

    // 2. Construct prompt for OpenAI
    let systemPrompt = `You are a world-class social media manager and copywriting expert. Your goal is to rewrite/format a description into a high-engagement post for ${platform.toUpperCase()}.
Make sure to always append 3-5 relevant, high-performing hashtags for this platform at the end of the post.
Return ONLY the final formatted copy/text of the post. Do not include any tags, labels, wrapper code, or quotes unless they are part of the post content itself.`;

    let userPrompt = `INPUT DESCRIPTION:
${description}

PLATFORM: ${platform.toUpperCase()}
`;

    if (primaryTemplate) {
      userPrompt += `
Please write the social post following this custom template structure:
TEMPLATE NAME: ${primaryTemplate.name}
TEMPLATE BODY:
---
${primaryTemplate.body}
---

Note: Follow this template structure as an example of how to write the post. Use the input description to populate the sections. If the template uses bracketed placeholders like [topic] or [hook], substitute them with relevant points from the description. Make sure the tone matches the template style. Be sure to append 3-5 relevant hashtags for ${platform.toUpperCase()} at the end.`;
    } else {
      userPrompt += `
There is no template set for this platform. Please re-write the input description professionally, optimized for ${platform.toUpperCase()}. Be sure to append 3-5 relevant hashtags for ${platform.toUpperCase()} and emojis to make it engaging.`;
    }

    // 3. Generate post content
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const generatedText = completion.choices[0]?.message?.content || "";
    return NextResponse.json({ success: true, text: generatedText });
  } catch (err: any) {
    console.error(`Format description failed:`, err);
    return NextResponse.json({ error: err.message || "Formatting failed" }, { status: 500 });
  }
}
