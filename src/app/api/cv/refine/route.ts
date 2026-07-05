import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const { currentOutput, refinementInstruction } = await req.json();

    if (!currentOutput || !refinementInstruction) {
      return NextResponse.json({ error: 'currentOutput and refinementInstruction are required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert CV writer assisting a user in refining their tailored CV.`;

    const userPrompt = `Here is the currently generated CV:
${JSON.stringify(currentOutput, null, 2)}

Apply this change and return the full updated CV in the exact same JSON format:
${refinementInstruction}

Return ONLY valid JSON, no markdown, no backticks.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const parsedResponse = JSON.parse(response.choices[0].message.content || '{}');

    return NextResponse.json(parsedResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
