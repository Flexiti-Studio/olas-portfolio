import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEPTH_CONFIG: Record<string, { modules: number; lessonsPerModule: number; flashcardsPerModule: number; quizPerModule: number }> = {
  quick:         { modules: 3,  lessonsPerModule: 2, flashcardsPerModule: 5,  quizPerModule: 4  },
  standard:      { modules: 5,  lessonsPerModule: 3, flashcardsPerModule: 7,  quizPerModule: 6  },
  comprehensive: { modules: 8,  lessonsPerModule: 4, flashcardsPerModule: 10, quizPerModule: 8  },
};

export async function POST(req: NextRequest) {
  const { text, title, focusAreas, depth, applicationId, applicationRole, applicationCompany, courseType, learningLevel } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'No content provided' }, { status: 400 });

  const config = DEPTH_CONFIG[depth] || DEPTH_CONFIG.standard;
  const encoder = new TextEncoder();

  const isLearning = courseType === 'learning';
  const expertRole = isLearning ? 'expert instructional designer and course creator' : 'expert instructional designer and interview coaching expert';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        send({ step: 1, label: 'Analysing your material...' });

        const systemPrompt = `You are a world-class ${expertRole}. Your job is to transform raw study material into a beautifully structured course syllabus shell.

CRITICAL RULES:
1. Return ONLY valid JSON — absolutely no markdown, no backticks, no explanation text outside the JSON object.
2. Design a structured syllabus containing course title, overall description, estimated duration, and a clear list of modules.
3. Each module must contain order, title, module description, and a list of specific lessons with their estimated reading time.
4. Do NOT generate the detailed content, quizzes, or flashcards for the lessons yet. Only generate the structural syllabus outline.`;

        const focusAreasStr = focusAreas?.length ? focusAreas.join(', ') : (isLearning ? 'Core Concepts, Practical Application, Advanced Topics' : 'Technical Skills, Behavioural Questions, System Design');
        const roleContext = applicationRole ? `\nTARGET ROLE: ${applicationRole}` : '';
        const companyContext = applicationCompany ? `\nTARGET COMPANY: ${applicationCompany}` : '';
        const typeContext = isLearning ? `\nCOURSE TYPE: Learning\nLEARNING LEVEL: ${learningLevel}` : '\nCOURSE TYPE: Interview Preparation';

        const userPrompt = `STUDY MATERIAL:
---
${text.slice(0, 14000)}
---

COURSE SETTINGS:
- Title (if provided): ${title || 'generate a precise, professional title'}${typeContext}
- Focus Areas: ${focusAreasStr}
- Depth: ${depth} — generate EXACTLY ${config.modules} modules
- Each module: EXACTLY ${config.lessonsPerModule} lessons outlined${roleContext}${companyContext}

Return this EXACT JSON structure:
{
  "title": "Professional descriptive course title",
  "description": "2-3 sentences describing what this course covers and what the learner will achieve",
  "estimatedDuration": "X hours Y minutes",
  "modules": [
    {
      "title": "Module title covering a clear topic",
      "description": "2-3 sentences about what this module covers and its interview relevance",
      "order": 1,
      "lessons": [
        {
          "title": "Specific lesson title covering a clear subtopic",
          "order": 1,
          "estimatedMinutes": 10
        }
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
          max_tokens: 4000,
          response_format: { type: 'json_object' },
          temperature: 0.7,
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
