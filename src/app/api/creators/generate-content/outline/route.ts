import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { title, format, details } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const systemPrompt = `You are a world-class creator consultant and content strategist. Your task is to analyze a content idea and generate a comprehensive production outline including:
1. An optimized, high-retention title
2. An expanded overview/details of the content strategy
3. A production strategy checklist (at least 3-4 items)
4. Competitor research points and general audience notes
5. A detailed script with timestamps (Hook, Intro, Act 1)

Return ONLY valid JSON. Do not include markdown formatting or backticks.`;

    const userPrompt = `CONTENT IDEA:
- Title: ${title}
- Format: ${format || "Video"}
- Details/Concept: ${details || "No details provided"}

Return this EXACT JSON structure:
{
  "title": "Optimized, click-worthy title variant",
  "details": "A detailed 3-5 sentence description of what this content covers, its target audience hook, and content strategy.",
  "checklist": [
    "Checklist task 1",
    "Checklist task 2",
    "Checklist task 3"
  ],
  "research": {
    "points": [
      { "title": "Competitor/Reference video or creator name", "note": "Specific styling, pacing, or b-roll techniques to learn and implement." },
      { "title": "Another competitor/reference name", "note": "Hook structure or visual transitions to adapt." }
    ],
    "notes": "Audience insights, drop-off warnings, and pacing tips for this format."
  },
  "script": "Hook (0:00 - 0:15)\\n\\"[Write the exact hook script here]\\"\\n\\nIntro (0:15 - 1:00)\\n\\"[Write the exact intro script here]\\"\\n\\nAct 1 (1:00 - 4:00)\\n[B-roll description] \\"[Write the act 1 script here]\\""
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 3000,
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(raw);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("Outline generation failed:", err);
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}
