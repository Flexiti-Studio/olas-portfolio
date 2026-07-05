import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { question, correctAnswer, userAnswer } = await req.json();
    if (!question || !userAnswer) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a strict but fair interview coach evaluating a candidate\'s answer. Return ONLY valid JSON.' },
        { role: 'user', content: `QUESTION: ${question}\nIDEAL ANSWER: ${correctAnswer}\nCANDIDATE ANSWER: ${userAnswer}\n\nReturn: { "correct": true|false, "score": 0-100, "feedback": "specific feedback paragraph" }` }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    return NextResponse.json(JSON.parse(raw));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
