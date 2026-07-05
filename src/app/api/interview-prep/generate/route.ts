import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEPTH_MODULES: Record<string, number> = { quick: 3, standard: 5, comprehensive: 8 };

export async function POST(req: NextRequest) {
  const { text, title, focusAreas, depth, applicationId, applicationRole, applicationCompany } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'No content provided' }, { status: 400 });

  const moduleCount = DEPTH_MODULES[depth] || 5;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        send({ step: 1, label: 'Analysing your material...' });

        const systemPrompt = `You are an expert instructional designer and interview coach. Transform raw study material into a structured, engaging course that prepares someone for a job interview. Every lesson must connect back to how it will be tested in a real interview. Return ONLY valid JSON — no markdown, no backticks, no explanation outside the JSON.`;

        const userPrompt = `MATERIAL:
${text.slice(0, 12000)}

COURSE TITLE (if provided): ${title || 'generate a concise, descriptive title'}
FOCUS AREAS: ${focusAreas?.length ? focusAreas.join(', ') : 'General Interview Prep'}
DEPTH: ${depth} — generate exactly ${moduleCount} modules
${applicationRole ? `LINKED ROLE: ${applicationRole}` : ''}
${applicationCompany ? `LINKED COMPANY: ${applicationCompany}` : ''}

Rules:
- STRICT RULE: If the MATERIAL is sufficient and detailed, focus strictly on it to generate the course. DO NOT invent outside concepts.
- If the MATERIAL is very short or insufficient, expand on it by adding industry-standard knowledge relevant to the ROLE or TOPIC.
- Every module: at least 2 lessons, 1 quiz (min 5 questions), 5+ flashcards
- Lesson content sections: vary types (paragraph/callout/code/steps/bullets/definition)
- whyThisMatters: reference specific interview scenarios directly
- Quiz types: multiple_choice (4 options) and true_false ONLY. Do not generate fill-in-the-blanks or short_answer.

Return this exact JSON:
{
  "title": "",
  "description": "",
  "estimatedDuration": "",
  "modules": [
    {
      "id": "module-1",
      "title": "",
      "description": "",
      "order": 1,
      "lessons": [
        {
          "id": "lesson-1-1",
          "title": "",
          "order": 1,
          "estimatedMinutes": 5,
          "content": {
            "introduction": "",
            "sections": [
              { "type": "paragraph", "heading": "", "body": "", "items": [], "language": "" }
            ],
            "whyThisMatters": ""
          }
        }
      ],
      "quiz": {
        "questions": [
          { "id": "q-1", "type": "multiple_choice", "question": "", "options": ["","","",""], "correctAnswer": "", "explanation": "" }
        ]
      },
      "flashcards": [
        { "id": "fc-1", "front": "", "back": "" }
      ]
    }
  ]
}`;

        send({ step: 2, label: 'Structuring course modules...' });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 8000,
          response_format: { type: 'json_object' },
        });

        send({ step: 3, label: 'Writing lesson content...' });
        send({ step: 4, label: 'Generating quiz questions...' });
        send({ step: 5, label: 'Creating flashcards...' });

        const raw = completion.choices[0]?.message?.content || '{}';
        let parsed: any = {};
        try { parsed = JSON.parse(raw); } catch { parsed = {}; }

        send({ step: 6, label: 'Finalising your course...', result: parsed });
        controller.close();
      } catch (err: any) {
        send({ error: err.message || 'Generation failed' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
  });
}
