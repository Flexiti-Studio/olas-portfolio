import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { rawData } = await req.json();
    if (!rawData) {
      return NextResponse.json({ error: "rawData is required" }, { status: 400 });
    }

    const systemPrompt = `You are a world-class creator analytics expert. Your task is to analyze raw performance data (text pasted from YouTube Studio, Instagram Insights, etc.) and extract key metrics into a structured JSON format.
    
Return ONLY valid JSON. Do not include markdown formatting or backticks.`;

    const userPrompt = `RAW DATA:
${rawData}

Extract the following metrics. If a metric is not present, estimate it reasonably based on the other numbers or return "N/A" for strings and 0 for numbers.
Return this EXACT JSON structure:
{
  "views": "String representing total views (e.g. '1.2M', '45K')",
  "viewsVsAvg": "String representing percentage difference vs average (e.g. '+12%', '-5%')",
  "avgViewDuration": "String representing time (e.g. '4:12')",
  "durationVsAvg": "String representing percentage difference (e.g. '+5%', '-2%')",
  "ctr": "String representing click-through rate percentage (e.g. '6.8%')",
  "ctrVsAvg": "String representing percentage difference (e.g. '+1.2%', '-0.5%')",
  "revenue": "String representing estimated revenue (e.g. '$4.2K')",
  "retentionDip": "String describing a notable dip or insight (e.g. 'Dip at 3:12 (Sponsor Segment)')",
  "chartData": [100, 90, 85, 70, 65, 63, 62, 60, 58, 55, 52, 48, 45, 42, 40] // Array of 15 numbers representing retention curve percentage over time
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(raw);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("Performance analysis failed:", err);
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 });
  }
}
