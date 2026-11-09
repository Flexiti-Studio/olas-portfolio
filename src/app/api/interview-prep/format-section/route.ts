import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { rawText, courseTitle, moduleTitle, lessonTitle } = await req.json();

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const systemPrompt = `You are an elite educational content formatter and technical curriculum designer.
Given raw notes, explanations, or pasted study material, transform it into well-structured section objects that perfectly match the application's learning module design.

CRITICAL FORMAT RULES:
1. Return ONLY valid JSON: an array of sections. NO wrapper keys, NO markdown backticks outside JSON.
2. Allowed section types and schemas:
   - "paragraph": { "type": "paragraph", "heading": "Short Subheading (Optional)", "body": "Clear, well-crafted paragraph text." }
   - "code": { "type": "code", "heading": "Code Purpose/Title", "language": "typescript|javascript|python|sql|bash|html|css", "description": "Short explanation of what this code does", "body": "Clean executable code snippet formatted across multiple lines with proper indentation" }
   - "bullets": { "type": "bullets", "heading": "Key Points / Takeaways", "items": ["Point 1", "Point 2", "Point 3"] }
   - "steps": { "type": "steps", "heading": "Implementation Steps / Procedure", "items": ["Step 1 explanation", "Step 2 explanation"] }
   - "callout": { "type": "callout", "heading": "Pro Tip / Warning / Key Insight", "body": "Important note to remember." }
   - "video": { "type": "video", "heading": "Video Explanation / Walkthrough Title", "video_url": "https://www.youtube.com/watch?v=...", "body": "Short optional video summary notes" }
   - "table": { "type": "table", "heading": "Comparison Table", "headers": ["Col 1", "Col 2"], "rows": [["Val A", "Val B"], ["Val C", "Val D"]] }
   - "definition": { "type": "definition", "heading": "Core Definition", "body": "Term: Detailed explanation and real-world analogy." }
3. CODE FORMATTING RULE (EXTREMELY IMPORTANT):
   - In "code" sections, NEVER flatten or compress code onto a single line!
   - Always preserve distinct lines using newline characters (\\n), standard 2-space indentation, line breaks after semicolons, opening brackets, closing brackets, and imports.
   - Code must read like a real production file.
4. LaTeX Math formatting:
   - For mathematical equations or formulas, you can include standard LaTeX in paragraph body, bullet items, or table cells wrapped with $...$ for inline or $$...$$ for display formulas (e.g. $O(n \\log n)$, $\\sum_{i=1}^n x_i$, $$f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$).
5. YouTube & Video links:
   - If the raw text contains YouTube URLs (youtube.com/watch?v=..., youtu.be/..., or youtube.com/shorts/...), generate a "video" section for it preserving the video link in "video_url".
6. Break messy, unformatted, or pasted text into distinct, logically ordered sections (e.g. explanation paragraphs, code blocks with proper syntax highlighting, lists/steps, tables, video embeds, and callouts). Do not put everything in one huge paragraph.`;

    const userPrompt = `Context:
Course: ${courseTitle || "Study Course"}
Module: ${moduleTitle || "Module"}
Topic / Lesson: ${lessonTitle || "Topic"}

Raw notes / content to structure and format:
---
${rawText.slice(0, 15000)}
---

Convert this content into a JSON array of sections:
[
  { "type": "paragraph", "heading": "...", "body": "..." },
  ...
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const sections = Array.isArray(parsed)
      ? parsed
      : parsed.sections || parsed.items || parsed.data || [];

    return NextResponse.json({ sections });
  } catch (err: any) {
    console.error("Format section error:", err);
    return NextResponse.json({ error: err.message || "Failed to format section" }, { status: 500 });
  }
}

