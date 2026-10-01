import { NextResponse } from "next/server";
import openai from "@/lib/openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { platform, name, description, body, samplePost, imagePromptTemplate } = await req.json();

    if (!samplePost) {
      return NextResponse.json({ error: "Sample post is required" }, { status: 400 });
    }

    const systemPrompt = `You are a world-class social media manager.
Your task is to rewrite the original post for ${platform.toUpperCase()}.
Keep the same message, facts, and tone as the original. DO NOT invent claims, stats, or links.
You MUST follow this exact template structure:

Template Name: ${name}
Description/Rules: ${description}
Structure:
${body}

Return ONLY the rewritten post text.`;

    const userPrompt = `ORIGINAL POST:\n"""\n${samplePost}\n"""`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    });

    const rewritten = completion.choices[0]?.message?.content || "";

    let imagePromptResult = "";
    if (imagePromptTemplate && imagePromptTemplate.trim() !== "") {
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
${imagePromptTemplate}`;

      const imageCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: imageSystemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      });

      imagePromptResult = imageCompletion.choices[0]?.message?.content || "";
    }

    return NextResponse.json({ success: true, rewritten, imagePrompt: imagePromptResult });
  } catch (error: any) {
    console.error("Error testing template:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
