import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { projectId, contentId, platform } = await req.json();
    if (!projectId || !contentId || !platform) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Fetch the project and identify the content item
    const project = await prisma.creatorProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const contents = (project.contents as any[]) || [];
    const contentItem = contents.find((c: any) => String(c.id) === String(contentId));

    if (!contentItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    // 2. Fetch primary template for this platform (if any)
    let templatePlatform = platform.toLowerCase();
    if (templatePlatform === "ig" || templatePlatform === "ig_image") {
      templatePlatform = "instagram";
    } else if (templatePlatform === "yt" || templatePlatform === "yt_video") {
      templatePlatform = "youtube";
    } else if (templatePlatform === "tk") {
      templatePlatform = "tiktok";
    } else if (templatePlatform === "x") {
      templatePlatform = "twitter";
    } else if (templatePlatform === "in") {
      templatePlatform = "linkedin";
    }

    const primaryTemplate = await prisma.socialTemplate.findFirst({
      where: {
        platform: templatePlatform,
        is_primary: true
      }
    });

    // 3. Construct prompt for OpenAI
    let systemPrompt = `You are a world-class social media manager and copywriting expert. Your goal is to repurpose a main video idea or script into a high-engagement post for ${platform.toUpperCase()}.
Return ONLY the final copy/text of the generated post. Do not include any tags, labels, or wrapper code unless they are part of the post content itself.`;

    let userPrompt = `MAIN CONTENT DETAILS:
- Title: ${contentItem.title}
- Overview: ${contentItem.details || "No overview"}
- Main Script: ${contentItem.text || "No script details"}

PLATFORM: ${platform.toUpperCase()}
`;

    if (primaryTemplate) {
      userPrompt += `
Please write the post according to this custom template structure:
TEMPLATE NAME: ${primaryTemplate.name}
TEMPLATE BODY:
---
${primaryTemplate.body}
---

Note: Replace any placeholder brackets like [topic] or [hook] in the template with actual content derived from the main content details above. Make sure the tone matches the platform and template style.`;
    } else {
      userPrompt += `
Please write a highly compelling post for this platform:
- For 'ig' (Instagram Reels): A hook-heavy short caption with relevant emojis.
- For 'ig_image' (Instagram Image Post): A compelling caption for a static photo or slide carousel post. Include a hook, detailed storytelling or tips, call to action, and relevant hashtags.
- For 'tk' (TikTok): A snappy, short caption with high-retention keywords and hashtags.
- For 'yt' (YouTube Shorts): An engaging short description.
- For 'yt_video' (YouTube Main Video): A full YouTube description containing a catchy video introduction, a summary of what viewers will learn, timeline chapters template, and call-to-actions.
- For 'x' (Twitter/X): A Twitter thread format. Double space between tweets (e.g. Tweet 1\\n\\nTweet 2\\n\\nTweet 3). Make it 3 to 4 tweets.
- For 'in' (LinkedIn): A professional, value-packed post with key takeaways.
- For 'fb' (Facebook): A friendly, engaging status update with a call-to-action.`;
    }

    // 4. Generate post content
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

    // 5. Update content item's socials map in the contents array
    const updatedContents = contents.map((c: any) => {
      if (String(c.id) === String(contentId)) {
        const socials = c.socials || {};
        socials[platform.toLowerCase()] = generatedText;
        return { ...c, socials };
      }
      return c;
    });

    // 6. Save the updated project to the database
    await prisma.creatorProject.update({
      where: { id: projectId },
      data: {
        contents: updatedContents
      }
    });

    return NextResponse.json({ success: true, text: generatedText });
  } catch (err: any) {
    console.error(`Social generation failed for platform:`, err);
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}
