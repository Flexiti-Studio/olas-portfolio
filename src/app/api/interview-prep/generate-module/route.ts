import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { courseId, moduleId } = await req.json();
    if (!courseId || !moduleId) {
      return NextResponse.json({ error: 'Missing courseId or moduleId' }, { status: 400 });
    }

    // Fetch course and module details from database
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        application: { select: { job_title: true, company: true } }
      }
    });

    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: { orderBy: { order: 'asc' } }
      }
    });

    if (!course || !module) {
      return NextResponse.json({ error: 'Course or Module not found' }, { status: 404 });
    }

    const systemPrompt = `You are a world-class instructional designer and interview coaching expert. Your job is to generate extremely detailed, high-quality interview preparation materials for a specific course module.

CRITICAL RULES:
1. Return ONLY valid JSON — absolutely no markdown, no backticks, no explanation text outside the JSON object.
2. Every lesson must have RICH content — at least 5-6 content sections with varied types.
3. Every section must have detailed, substantive body text (3-5 sentences minimum per section).
4. Make content directly relevant to passing real technical interviews at top companies.
5. Only include a 'code' section in a lesson if the topic genuinely requires code to be understood (e.g. algorithms, data structures, specific API usage, framework patterns, SQL queries, etc.). Do NOT add code sections to behavioural, communication, or conceptual-only lessons. When code IS included, it must be real, runnable, well-commented, and directly relevant to what an interviewer would test.
6. Flashcard backs must be detailed explanations, not just one-word answers.
7. Quiz questions must test deep understanding, not just surface recall.

CONTENT QUALITY STANDARDS:
- paragraph: 3-5 detailed sentences explaining the concept.
- callout: Important interview tips or common mistakes to avoid.
- code: Real, runnable code with inline comments. Use the 'language' field (e.g. "javascript", "python", "java", "typescript", "sql", "bash") and 'description' field to explain what the snippet demonstrates. The 'body' field contains ONLY the raw code string.
- bullets: 4-8 comprehensive bullet points.
- steps: Clear numbered process with detailed explanations.
- definition: Complete definitions with context and examples.
- table: Comparative or reference tables with clear headers and rows to summarize trade-offs or specs.
- The "whyThisMatters" field must contain 3-4 sentences explaining exactly how this topic appears in real interviews, what competencies are being assessed, common mistakes candidates make, and what a standout answer looks like.`;

    const focusAreasStr = course.focus_areas?.length ? course.focus_areas.join(', ') : 'Technical Skills, Behavioural Questions, System Design';
    const roleContext = course.application?.job_title ? `\nTARGET ROLE: ${course.application.job_title}` : '';
    const companyContext = course.application?.company ? `\nTARGET COMPANY: ${course.application.company}` : '';

    const lessonsList = module.lessons.map(l => `- "${l.title}" (ID: ${l.id})`).join('\n');

    const userPrompt = `STUDY MATERIAL SUMMARY / CONTEXT:
---
${course.source_text ? course.source_text.slice(0, 14000) : 'No study material provided.'}
---

COURSE SETTINGS:
- Course Title: ${course.title}
- Focus Areas: ${focusAreasStr}
${roleContext}${companyContext}

MODULE TO GENERATE:
- Title: "${module.title}"
- Description: "${module.description || ''}"
- Generate detailed content for these EXACT lessons:
${lessonsList}

Requirements for the Quiz:
- Generate 5-6 high-quality quiz questions for this module.
- Questions should be multiple choice or true/false.

Requirements for Flashcards:
- Generate 8-10 spaced repetition flashcards for key concepts in this module.

Return this EXACT JSON structure (fill every field with detailed, substantive content):
{
  "lessons": [
    {
      "id": "Use the exact lesson ID provided in the list above",
      "content": {
        "introduction": "2-3 sentences introducing the concept and why it matters for this module/role",
        "sections": [
          {
            "type": "paragraph",
            "heading": "Syllabus Concept",
            "body": "Detailed 3-5 sentence explanation of the main concept with concrete examples and context"
          },
          {
            "type": "code",
            "heading": "Code Example",
            "language": "javascript",
            "description": "1-2 sentence explanation of what this code demonstrates and why it matters in interviews",
            "body": "// Real, runnable code with inline comments\nfunction exampleFunction(input) {\n  // Each key step commented\n  return result;\n}"
          },
          {
            "type": "table",
            "heading": "Trade-offs and Comparison",
            "headers": ["Option", "Pros", "Cons"],
            "rows": [
              ["Approach A", "Fast reads", "Complex cache invalidation"],
              ["Approach B", "Real-time updates", "Heavy DB load"]
            ]
          },
          {
            "type": "callout",
            "heading": "Interview Insight",
            "body": "Specific tip about how this topic appears in interviews, what interviewers look for, and common pitfalls"
          },
          {
            "type": "bullets",
            "heading": "Key Points to Remember",
            "items": ["Detailed point 1 with explanation", "Detailed point 2 with explanation", "Detailed point 3 with explanation"]
          },
          {
            "type": "steps",
            "heading": "How to Implement",
            "items": ["Step 1 explanation", "Step 2 explanation", "Step 3 explanation"]
          },
          {
            "type": "definition",
            "heading": "Key Term",
            "body": "Term Name: Complete definition with context, real-world application, and interview relevance"
          }
        ],
        "whyThisMatters": "3-4 sentences explaining exactly how this topic appears in real interviews, what competencies are being assessed, common mistakes candidates make, and what a standout answer looks like"
      }
    }
  ],
  "quiz": {
    "questions": [
      {
        "id": "q-1",
        "type": "multiple_choice",
        "question": "Detailed question testing deep understanding?",
        "options": ["Option A - incorrect", "Option B - correct", "Option C - incorrect", "Option D - incorrect"],
        "correctAnswer": "Option B - correct",
        "explanation": "Explanation of why the option is correct."
      }
    ]
  },
  "flashcards": [
    {
      "front": "Flashcard front side question?",
      "back": "Detailed back side answer with explanation."
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 16000,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    // Save generated content to database
    // 1. Save lesson contents
    if (Array.isArray(parsed.lessons)) {
      for (const les of parsed.lessons) {
        if (les.id && les.content) {
          await prisma.lesson.update({
            where: { id: les.id },
            data: { content: les.content }
          });
        }
      }
    }

    // 2. Save Quiz
    if (parsed.quiz?.questions?.length) {
      await prisma.quiz.upsert({
        where: { module_id: moduleId },
        create: {
          module_id: moduleId,
          questions: parsed.quiz.questions
        },
        update: {
          questions: parsed.quiz.questions
        }
      });
    }

    // 3. Save Flashcards (Clear old ones first)
    if (Array.isArray(parsed.flashcards)) {
      await prisma.flashcard.deleteMany({
        where: { module_id: moduleId }
      });

      await prisma.flashcard.createMany({
        data: parsed.flashcards.map((fc: any) => ({
          module_id: moduleId,
          front: fc.front || 'Question',
          back: fc.back || 'Answer'
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Module content generation error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
