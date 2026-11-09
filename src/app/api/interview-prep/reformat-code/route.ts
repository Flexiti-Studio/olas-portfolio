import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const systemPrompt = `You are an expert code formatter and syntax beautifier.
Given a code snippet that may be flattened onto a single line, poorly indented, or unformatted:
1. Reformat it into clean, idiomatic, multi-line code with standard 2-space or 4-space indentation.
2. Preserve all comments, variable names, logic, and structure.
3. Return ONLY valid JSON:
{
  "formattedCode": "..."
}
CRITICAL: Do NOT wrap the JSON in Markdown backticks. Ensure real newline characters (\\n) and proper indents are preserved in the JSON string value.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Language: ${language || "typescript"}\n\nCode to format:\n${code}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({
      formattedCode: parsed.formattedCode || code,
    });
  } catch (err: any) {
    console.error("Reformat code error:", err);
    return NextResponse.json({ error: err.message || "Failed to reformat code" }, { status: 500 });
  }
}

