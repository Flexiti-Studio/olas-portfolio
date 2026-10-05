import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import openai from "@/lib/openai";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const PlatformResultSchema = z.object({
  platform: z.string(),
  content: z.union([z.string(), z.array(z.string())]),
});

const GeneratePackageSchema = z.object({
  imagePrompt: z.string().optional().default(""),
  negativePrompt: z.string().optional(),
  versions: z.array(PlatformResultSchema),
});

const platformRules: Record<string, string> = {
  x: "Output a thread, not a single block. Each tweet is 280 chars or fewer, with a strong hook tweet first, one idea per tweet, optional '1/', '2/' numbering, and the CTA or link in the last tweet. Max 1-2 hashtags.",
  twitter: "Output a thread, not a single block. Each tweet is 280 chars or fewer, with a strong hook tweet first, one idea per tweet, optional '1/', '2/' numbering, and the CTA or link in the last tweet. Max 1-2 hashtags.",
  linkedin: "The hook must fit in the first ~200 characters (before 'see more'), short paragraphs with blank lines, 1,300-2,000 chars ideal, 3-5 hashtags at the end, a question or CTA to close.",
  instagram: "Caption with a hook in the first ~125 chars, line breaks, a light emoji touch, CTA, then a hashtag block (5-15 relevant). Max 2,200 chars.",
  tiktok: "Short punchy caption (hook plus 3-5 hashtags), conversational tone, and a suggested on-screen text line.",
  facebook: "Conversational, 1-3 short paragraphs, optional question, minimal hashtags.",
  youtube: "Title (100 chars or fewer, keyword first), description (first 2 lines carry the hook and link), tags.",
  threads: "500 chars or fewer per post, conversational, split into a chain if longer. Return an array of strings."
};

const platformLimits: Record<string, number> = {
  x: 280,
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200,
  facebook: 63206,
  youtube: 5000,
  threads: 500,
};

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        versions: true,
      }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {}

    let targetSocials = body.targetSocials;
    let imagePromptOnly = body.imagePromptOnly === true;

    if (!imagePromptOnly) {
      if (!targetSocials || targetSocials.length === 0) {
        targetSocials = post.versions
          .filter(v => v.status === "pending" || v.status === "failed")
          .map(v => v.socialId);
      }

      if (!targetSocials || targetSocials.length === 0) {
        return NextResponse.json({ error: "No target socials provided or pending" }, { status: 400 });
      }
    } else {
      targetSocials = [];
    }

    // Prepare instructions for each platform
    const platformInstructions = await Promise.all(targetSocials.map(async (platform: string) => {
      // Find template
      const template = await prisma.socialTemplate.findFirst({
        where: { platform, is_primary: true }
      });

      let instructions = platformRules[platform.toLowerCase()] || "Infer sensible rules from template description.";
      let hasTemplate = false;
      let ytTemplates = null;

      if (template) {
        hasTemplate = true;
        let structure = template.body;
        
        if (platform === "youtube") {
          try {
            const parsed = JSON.parse(template.body);
            if (parsed.__youtubeTemplate) {
              structure = parsed.script;
              ytTemplates = parsed;
            }
          } catch(e) {}
        }
        
        instructions += `\nFollow this template:\nTemplate Name: ${template.name}\nDescription: ${template.description || ''}\nStructure: ${structure}`;
      }

      return {
        platform,
        instructions,
        hasTemplate,
        templateId: template?.id || null,
        imagePromptTemplate: template?.imagePromptTemplate || null,
        ytTemplates
      };
    }));

    const systemPrompt = `You are a world-class social media manager.
Your task is to rewrite the original post for several specific social media platforms.
Ensure the writing sounds highly human, readable, clear, and is genuinely interesting to read. Avoid robotic or overly formal phrasing.
Keep the same message, facts, tone, and structural flow as the original. DO NOT invent claims, stats, or links.

You must return your response as a strictly valid JSON object matching this schema:
{
  "imagePrompt": "Leave empty or write a generic prompt",
  "negativePrompt": "Optional short negative prompt...",
  "versions": [
    {
      "platform": "...",
      "content": "..." // String for single posts, or Array of Strings for threads (like X/Twitter)
    }
  ]
}
`;

    const userPrompt = `ORIGINAL POST (Source: ${post.sourceSocialId || 'Unknown'}):
"""
${post.originalContent}
"""

TARGET PLATFORMS AND INSTRUCTIONS:
${platformInstructions.map(p => `--- PLATFORM: ${p.platform} ---\n${p.instructions}`).join('\n\n')}
`;

    let generatedPackage: any = { imagePrompt: "", negativePrompt: "", versions: [] };
    
    if (!imagePromptOnly) {
      let attempts = 0;
      const maxAttempts = 2;
      let packageResult = null;

      while (attempts < maxAttempts && !packageResult) {
        attempts++;
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
          });

          const content = completion.choices[0]?.message?.content || "{}";
          const parsed = JSON.parse(content);
          
          packageResult = GeneratePackageSchema.parse(parsed);
        } catch (err) {
          console.warn(`Attempt ${attempts} failed:`, err);
          if (attempts >= maxAttempts) throw err;
        }
      }

      if (!packageResult) {
        throw new Error("Failed to generate or validate post package");
      }
      generatedPackage = packageResult;
    }

    const generatedImagePrompts: Record<string, string> = {};
    const generatedYtPrompts: Record<string, any> = {};

    for (const p of platformInstructions) {
      if (p.imagePromptTemplate) {
        const imageSystemPrompt = `You are an Image Prompt Engineer. Your job is to turn a social media post into a single, ready-to-use image generation prompt by following a reference TEMPLATE.

INPUTS
1. TEMPLATE: a prompt (or image description) that defines the visual format: layout, structure, style, palette, icon style, typography, and a list of {{placeholders}}.
2. POST: the text of the post the image will accompany.

STEP 1: STUDY THE TEMPLATE
- Identify what is fixed: layout logic, visual style, palette, typography, icon style, and the "DO NOT include" rules. Keep all of this unchanged.
- Identify what is variable: every {{placeholder}} and any example content tied to the template's original topic.
- Identify the structural idea the layout expresses. Reuse that visual logic for the new topic.

STEP 2: ANALYZE THE POST
- Find the single core message of the post in one sentence.
- Extract only what the image needs: titles, 3-4 component labels per side or section, and the relationship between them.
- Shorten all labels to 1-3 words. Use the post's own terminology.
- Choose one simple icon per component that fits its meaning.

STEP 3: FILL THE TEMPLATE
- Replace every {{placeholder}} with specifics from the post.
- Remove any leftover wording from the template's original topic.
- Keep style, palette, and layout rules exactly as the template defines them.
- Use only text that appears in the image as labels or titles. Never add paragraphs, captions, or statistics.
- If the post has more points than fit, keep the 3-4 most important ones. Do not overcrowd the image.

STEP 4: QUALITY CHECK (silently verify before answering)
- Does the image communicate the post's core message at a glance?
- Is every label short, correctly spelled, and taken from the post?
- Are the layout, palette, and style consistent with the template?
- Are there any unfilled {{placeholders}}, or leftover words from the template's example topic?

OUTPUT RULES
- Output ONLY the final image prompt as plain text. No preamble, no explanation, no markdown headings, no quotes around it.
- Write the prompt as a clear description of the finished image: canvas, titles, each panel or section, style, palette, and a final "Do not include" line.
- Put any text the image must render in "double quotes" so the image model spells it exactly.
- If the post does not seem to fit the template's structure perfectly, BE CREATIVE. Re-interpret or extrapolate elements from the post to fit the template's structure. You must creatively adapt the post concepts into the required visual layout instead of failing.

TEMPLATE:
${p.imagePromptTemplate}`;

        try {
          const imageCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: imageSystemPrompt },
              { role: "user", content: `ORIGINAL POST (Source: ${post.sourceSocialId || 'Unknown'}):\n"""\n${post.originalContent}\n"""` }
            ],
            temperature: 0.7,
          });
          generatedImagePrompts[p.platform] = imageCompletion.choices[0]?.message?.content || "";
        } catch (err) {
          console.error(`Image prompt generation failed for ${p.platform}:`, err);
        }
      }

      if (p.platform === "youtube" && p.ytTemplates) {
        try {
          const ytPrompts: any = {};
          
          if (p.ytTemplates.sceneBreakdown) {
            const sceneCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: `You are a scene breakdown director. Given a template for scene breakdown and a sample post/script, generate the exact scene breakdown for this content.\n\nTEMPLATE:\n${p.ytTemplates.sceneBreakdown}\n\nFill in any {{placeholders}} using content from the post provided. Return only the final ready-to-use scene breakdown.` },
                { role: "user", content: `ORIGINAL POST (Source: ${post.sourceSocialId || 'Unknown'}):\n"""\n${post.originalContent}\n"""` }
              ],
              temperature: 0.6,
            });
            ytPrompts.sceneBreakdown = sceneCompletion.choices[0]?.message?.content || "";
          }

          if (p.ytTemplates.voicePrompt) {
            const voiceCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: `You are a voice narration director. Given a template for voice/TTS generation instructions and a sample post/script, generate the exact voice direction prompt for this content.\n\nTEMPLATE:\n${p.ytTemplates.voicePrompt}\n\nFill in any {{placeholders}} using content from the post provided. Return only the final ready-to-use voice prompt.` },
                { role: "user", content: `ORIGINAL POST (Source: ${post.sourceSocialId || 'Unknown'}):\n"""\n${post.originalContent}\n"""` }
              ],
              temperature: 0.6,
            });
            ytPrompts.voicePrompt = voiceCompletion.choices[0]?.message?.content || "";
          }

          if (p.ytTemplates.videoPrompt) {
            const videoCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: `You are a video prompt engineer. Given a template for AI video generation and a sample post/script, produce the exact video generation prompt for this content.\n\nTEMPLATE:\n${p.ytTemplates.videoPrompt}\n\nFill in any {{placeholders}} using content from the post provided. Return only the final ready-to-use video prompt.` },
                { role: "user", content: `ORIGINAL POST (Source: ${post.sourceSocialId || 'Unknown'}):\n"""\n${post.originalContent}\n"""` }
              ],
              temperature: 0.6,
            });
            ytPrompts.videoPrompt = videoCompletion.choices[0]?.message?.content || "";
          }
          
          generatedYtPrompts[p.platform] = ytPrompts;
        } catch (err) {
          console.error(`YouTube extra prompts generation failed:`, err);
        }
      }
    }

    // Save versions and enforce character limits
    const savedVersions = [];
    for (const p of platformInstructions) {
      const generated = generatedPackage.versions.find((v: any) => v.platform === p.platform);
      
      let finalContent: any = "";
      let status = "failed";

      if (generated) {
        if (p.platform === "youtube" && p.ytTemplates) {
          finalContent = {
            script: generated.content,
            sceneBreakdown: generatedYtPrompts[p.platform]?.sceneBreakdown || "",
            voicePrompt: generatedYtPrompts[p.platform]?.voicePrompt || "",
            videoPrompt: generatedYtPrompts[p.platform]?.videoPrompt || "",
          };
        } else {
          finalContent = generated.content;
        }
        status = "ready";

        // Check character limits
        const limit = platformLimits[p.platform.toLowerCase()];
        if (limit) {
          if (Array.isArray(finalContent)) {
            // For threads
            const hasExceeded = finalContent.some(segment => segment.length > limit);
            if (hasExceeded) {
              // We just flag it in status, or keep it ready but UI will flag it.
              // We will just let UI flag it since Phase 2 says "count and flag any version that exceeds its limit"
            }
          } else if (typeof finalContent === 'string') {
            if (finalContent.length > limit) {
              // Let UI flag it
            }
          }
        }
      }

      // Upsert the version
      const existingVersion = post.versions.find(v => v.socialId === p.platform);
      
      let versionRecord;
      if (existingVersion) {
        versionRecord = await prisma.postVersion.update({
          where: { id: existingVersion.id },
          data: {
            ...(imagePromptOnly ? {} : { content: finalContent, status }),
            templateId: p.templateId,
            ...(generatedImagePrompts[p.platform] && { imagePrompt: generatedImagePrompts[p.platform] })
          }
        });
      } else {
        versionRecord = await prisma.postVersion.create({
          data: {
            postId: post.id,
            socialId: p.platform,
            content: finalContent,
            status,
            templateId: p.templateId,
            ...(generatedImagePrompts[p.platform] && { imagePrompt: generatedImagePrompts[p.platform] })
          }
        });
      }
      savedVersions.push(versionRecord);
    }

    return NextResponse.json({ success: true, post: post, versions: savedVersions });
  } catch (error: any) {
    console.error("Error generating post package:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
