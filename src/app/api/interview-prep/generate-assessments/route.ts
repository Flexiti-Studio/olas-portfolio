import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { courseId } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
            quiz: true,
            flashcards: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Build context from module titles, lesson titles, and section contents
    const curriculumOutline = course.modules
      .map((m, i) => {
        const lessonSummaries = m.lessons
          .map((l) => {
            const secHeadings = (l.content as any)?.sections?.map((s: any) => s.heading).filter(Boolean).join(", ");
            return `  - Lesson: "${l.title}" ${secHeadings ? `(Subtopics: ${secHeadings})` : ""}`;
          })
          .join("\n");
        return `Module ${i + 1}: "${m.title}"\n${lessonSummaries}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a world-class educational examiner and assessment creator.
Your job is to generate comprehensive, high-quality multiple choice quiz questions and spaced-repetition flashcards for each module of a study course.

CRITICAL RULES:
1. Return ONLY valid JSON matching the exact schema below.
2. For each module, generate:
   - 4-6 high quality multiple-choice quiz questions.
     - Each question must have: "question", "type": "multiple_choice", "options" (array of 4 distinct choices), "correctAnswer" (exact string matching one of the options), "explanation" (detailed explanation).
   - 5-8 flashcards with a clear "front" question/prompt and a detailed 2-4 sentence "back" answer.
3. Every question and flashcard must test real understanding of the topics listed.`;

    const userPrompt = `COURSE TITLE: "${course.title}"
COURSE DESCRIPTION: "${course.description || ""}"

CURRICULUM OUTLINE:
---
${curriculumOutline.slice(0, 14000)}
---

Generate an array of module assessment objects matching this EXACT JSON schema:
{
  "assessments": [
    ${course.modules
      .map(
        (m) => `{
      "moduleId": "${m.id}",
      "moduleTitle": "${m.title}",
      "questions": [
        {
          "question": "Clear technical question?",
          "type": "multiple_choice",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Why this is correct..."
        }
      ],
      "flashcards": [
        {
          "front": "Concept or Question?",
          "back": "Clear, detailed explanation."
        }
      ]
    }`
      )
      .join(",\n")}
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    const assessments = parsed.assessments || [];

    // Save generated assessments into the database
    for (const item of assessments) {
      if (!item.moduleId) continue;

      // Upsert quiz
      if (item.questions && item.questions.length > 0) {
        await prisma.quiz.upsert({
          where: { module_id: item.moduleId },
          update: { questions: item.questions },
          create: { module_id: item.moduleId, questions: item.questions },
        });
      }

      // Add flashcards
      if (item.flashcards && item.flashcards.length > 0) {
        await prisma.flashcard.deleteMany({
          where: { module_id: item.moduleId },
        });

        await prisma.flashcard.createMany({
          data: item.flashcards.map((fc: any) => ({
            module_id: item.moduleId,
            front: fc.front || "Concept",
            back: fc.back || "Answer",
          })),
        });
      }
    }

    return NextResponse.json({ success: true, count: assessments.length });
  } catch (err: any) {
    console.error("Generate quiz/flashcards error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate assessment" }, { status: 500 });
  }
}

