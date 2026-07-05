import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge'; // Vercel edge function for better streaming

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, jobTitle, jobDescription, tone } = body;

    if (!company || !jobTitle) {
      return NextResponse.json({ error: 'Company and Job Title are required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert career coach and cover letter writer. 
    Write a highly tailored, professional cover letter for the user.
    Do not use placeholders like [Your Name] or [Your Address]. Assume the user is 'Olasunkanmi' if needed, but keep it focused on the content.
    Keep the letter to around 3-4 paragraphs.
    Tone: ${tone || 'Professional'}.`;

    const userPrompt = `
      Company: ${company}
      Job Title: ${jobTitle}
      Job Description: ${jobDescription || 'Not provided. Make logical assumptions based on the job title.'}
      
      Please generate the cover letter now. No intro or outro text, just the letter itself.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or gpt-3.5-turbo
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    });

    // Create a stream to send back to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('OpenAI Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate cover letter' }, { status: 500 });
  }
}
