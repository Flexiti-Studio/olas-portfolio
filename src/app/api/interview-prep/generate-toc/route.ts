import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { topicsText } = await req.json();

    if (!topicsText || !topicsText.trim()) {
      return NextResponse.json({ error: "No topics provided" }, { status: 400 });
    }

    const systemPrompt = `You are an expert curriculum designer and educator.
The user provides a raw list of topics, notes, or bullet points they want to learn or study.
Your job is to:
1. Analyze the topics and synthesize a professional, concise course title and course description.
2. Group the topics into logical Modules (the Table of Contents).
3. Under each Module, list the specific Topics / Lessons (sub-headings).
4. Return ONLY valid JSON matching the exact schema specified below.

JSON SCHEMA:
{
  "title": "Comprehensive & Catchy Course Title",
  "description": "2-3 sentences summarizing the curriculum coverage and learning outcomes.",
  "estimatedDuration": "e.g., 4 hours 30 mins",
  "modules": [
    {
      "title": "Module 1: Descriptive Title",
      "description": "Brief 1-line summary of this module",
      "lessons": [
        {
          "title": "Topic or Sub-heading Name",
          "estimatedMinutes": 10
        }
      ]
    }
  ]
}

CRITICAL RULES:
- Ensure all user topics are represented cleanly.
- Organize logically from fundamentals to practical/advanced concepts.
- Provide clear, descriptive topic names for each module.
- Return ONLY the JSON object. No Markdown codeblocks.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: topicsText },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Generate TOC error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate table of contents" }, { status: 500 });
  }
}

