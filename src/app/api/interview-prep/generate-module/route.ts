import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { courseId, moduleId, courseType, learningLevel } = await req.json();
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

    const isLearning = courseType === 'learning';
    const expertRole = isLearning ? 'expert instructional designer and course creator' : 'expert instructional designer and interview coaching expert';
    const focusTarget = isLearning 
      ? (learningLevel === 'basic' || learningLevel === 'beginners' 
          ? 'Make content directly relevant to someone learning this for the first time. EXPLAIN EVERYTHING IN LAYMAN TERMS, use simple analogies, provide step-by-step breakdowns, and be EXHAUSTIVE and VERY explanatory. Do not assume prior knowledge. Break down complex topics into digestible pieces.'
          : 'Make content directly relevant to someone learning this topic at an advanced level. Provide deep insights, edge cases, and exhaustive technical explanations.')
      : 'Make content directly relevant to passing real technical interviews at top companies. Be thorough and provide exhaustive technical details.';

    const isBeginnerLearning = isLearning && (learningLevel === 'basic' || learningLevel === 'beginners');
    const calloutLabel = isBeginnerLearning ? '💡 Beginner Tip' : '⚠️ Common Mistake';
    const calloutInstruction = isBeginnerLearning
      ? 'A real-world analogy or mnemonic that makes the concept stick for a beginner. Use everyday comparisons, avoid jargon.'
      : 'A common pitfall, interview trap, or misconception to avoid.';

    const systemPrompt = `You are a world-class ${expertRole}. Your job is to generate extremely detailed, high-quality ${isLearning ? 'learning' : 'interview preparation'} materials for a specific course module.

CRITICAL RULES:
1. Return ONLY valid JSON — absolutely no markdown, no backticks, no explanation text outside the JSON object.
2. Every lesson must cover EVERY SINGLE sub-topic named in the lesson title INDIVIDUALLY. If a lesson is titled "Variables, Data Types, and Operators", you must have a dedicated explanation paragraph for Variables, another for Data Types, and another for Operators — each with its own code block. Do NOT lump them together.
3. Each sub-topic gets its own "paragraph" section (heading = exact sub-topic name) with 6-10 deeply detailed sentences. This is the core explanation — do NOT skimp.
4. IMMEDIATELY after each sub-topic "paragraph" that involves code or syntax, insert a "code" section showing a complete, runnable example for JUST that sub-topic.
5. ${focusTarget}
6. The "introduction" must be a proper 4-6 sentence paragraph orienting the learner: what the lesson covers, why each part matters, and what they will be able to do after.
7. After all sub-topic paragraphs, add a "bullets" cheat-sheet listing ALL concepts covered — one item per concept formatted as "ConceptName — one-line explanation".
8. Add a "table" whenever there are 2+ things to compare (e.g. different data types, operators, methods, approaches).
9. Add a "callout" with a ${calloutLabel}: ${calloutInstruction}
10. Add a "steps" section whenever there is an actual process or setup to follow.
11. Flashcard backs must be full 3-5 sentence explanations, not one-word answers.
12. Quiz questions must test SPECIFIC understanding of each named sub-topic.
13. "whyThisMatters" must be 4-6 sentences referencing the specific sub-topics covered.

CONTENT QUALITY STANDARDS:
- paragraph: 6-10 detailed sentences about ONE specific sub-topic. Use analogies, examples, context. This is the heart of the lesson.
- code: Real, runnable code with a comment on EVERY significant line. 'language' field required. 'description' explains WHY this example matters. 'body' is raw code only.
- bullets: Full cheat-sheet list. Format each item as "Term — brief explanation". At least 6-10 items.
- steps: Numbered sequential process. Each step is 2-3 sentences.
- definition: "Term: full definition, why it exists, real-world analogy."
- table: 3+ rows of meaningful comparisons with clear column headers.
- callout: Focused tip, warning, or analogy. Memorable and concise.`;

    const focusAreasStr = course.focus_areas?.length ? course.focus_areas.join(', ') : (isLearning ? 'Core Concepts, Practical Application, Advanced Topics' : 'Technical Skills, Behavioural Questions, System Design');
    const roleContext = course.application?.job_title ? `\nTARGET ROLE: ${course.application.job_title}` : '';
    const companyContext = course.application?.company ? `\nTARGET COMPANY: ${course.application.company}` : '';
    const typeContext = isLearning ? `\n- Course Type: Learning\n- Learning Level: ${learningLevel}` : '\n- Course Type: Interview Preparation';

    const lessonsList = module.lessons.map(l => `- "${l.title}" (ID: ${l.id})`).join('\n');

    const userPrompt = `STUDY MATERIAL SUMMARY / CONTEXT:
---
${course.source_text ? course.source_text.slice(0, 14000) : 'No study material provided.'}
---

COURSE SETTINGS:
- Course Title: ${course.title}${typeContext}
- Focus Areas: ${focusAreasStr}
${roleContext}${companyContext}

MODULE TO GENERATE:
- Title: "${module.title}"
- Description: "${module.description || ''}"
- Lessons to generate (use EXACT IDs):
${lessonsList}

CONTENT GENERATION RULES — FOLLOW EXACTLY:
For EACH lesson:
1. Parse the lesson title and identify EVERY distinct sub-topic or concept named in it.
2. For EACH sub-topic, generate a dedicated "paragraph" section (heading = that exact sub-topic name) with 6-10 sentences.
3. Immediately after each sub-topic paragraph that involves code/syntax, insert a "code" section for JUST that sub-topic.
4. Example: lesson titled "Lists, Tuples, Dictionaries, Sets" MUST produce:
   - paragraph: "Lists" (6-10 sentences)
   - code: Lists example
   - paragraph: "Tuples" (6-10 sentences)  
   - code: Tuples example
   - paragraph: "Dictionaries" (6-10 sentences)
   - code: Dictionaries example
   - paragraph: "Sets" (6-10 sentences)
   - code: Sets example
   - bullets: cheat-sheet of all four
   - table: comparison table of all four
   - callout: beginner tip or common mistake
5. Never write a single generic paragraph about "all data types". Always one paragraph per type.

Requirements for the Quiz:
- Generate 8-10 high-quality quiz questions for this module.
- Each question must target a SPECIFIC named sub-topic from the lessons.
- Multiple choice (4 options) or true/false.
- Include a detailed "explanation" for every answer.

Requirements for Flashcards:
- Generate 12-15 spaced repetition flashcards — one per distinct concept/sub-topic.
- Backs must be 3-5 sentence explanations, not single words or phrases.

Return this EXACT JSON structure:
{
  "lessons": [
    {
      "id": "EXACT lesson ID from the list above — do not invent IDs",
      "content": {
        "introduction": "4-6 sentences orienting the learner: what is covered, why each named sub-topic matters, what they will be able to do after this lesson",
        "sections": [
          {
            "type": "paragraph",
            "heading": "Exact Sub-Topic Name",
            "body": "6-10 sentences of deep, detailed explanation of this ONE sub-topic. Real-world analogies, concrete examples, why it exists, how it works, common uses."
          },
          {
            "type": "code",
            "heading": "Sub-Topic Name — Example",
            "language": "python",
            "description": "What this code demonstrates and why it is important to understand",
            "body": "# Every line has a comment explaining what it does and why\nname = 'Ola'  # Create a variable called name and assign the string 'Ola' to it"
          },
          {
            "type": "bullets",
            "heading": "Quick-Reference Cheat Sheet",
            "items": [
              "ConceptName — one-line explanation of what it is and when to use it",
              "ConceptName — one-line explanation"
            ]
          },
          {
            "type": "table",
            "heading": "Comparison",
            "headers": ["Concept", "Description", "Mutable?", "Example"],
            "rows": [
              ["List", "Ordered collection", "Yes", "[1, 2, 3]"],
              ["Tuple", "Ordered, fixed collection", "No", "(1, 2, 3)"]
            ]
          },
          {
            "type": "callout",
            "heading": "${calloutLabel}",
            "body": "${calloutInstruction}"
          }
        ],
        "whyThisMatters": "4-6 sentences: why every sub-topic in this lesson matters, how they all connect, what real-world problems they solve, and what mastery looks like"
      }
    }
  ],
  "quiz": {
    "questions": [
      {
        "id": "q-1",
        "type": "multiple_choice",
        "question": "Specific question about a named sub-topic?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option B",
        "explanation": "Why this is correct and why each other option is wrong."
      }
    ]
  },
  "flashcards": [
    {
      "front": "Specific concept or term from the lesson?",
      "back": "3-5 sentence explanation: definition, why it exists, how it works, and a concrete example."
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
