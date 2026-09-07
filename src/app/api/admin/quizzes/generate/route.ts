import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export async function POST(req: NextRequest) {
  try {
    const { sourceText, topic, questionCount = 5, mode = 'direct_import' } = await req.json();

    if (!sourceText || typeof sourceText !== 'string' || !sourceText.trim()) {
      return NextResponse.json({ error: 'Source text or question prompt is required' }, { status: 400 });
    }

    const targetCount = Math.min(Math.max(Number(questionCount) || 5, 1), 30);

    let modeInstruction = '';

    if (mode === 'direct_import') {
      modeInstruction = `MODE: EXACT DIRECT IMPORT (VERBATIM EXTRACTION)
CRITICAL RULES FOR DIRECT IMPORT:
1. Parse and extract EVERY SINGLE QUESTION present in the user's input text verbatim.
2. DO NOT rewrite, paraphrase, simplify, condense, or omit any question. Keep the exact question wording intact as written.
3. If multiple-choice options are provided in the input, use those exact options. If options are missing or incomplete, create 4 logical, distinct multiple choice options including the correct answer.
4. Identify the exact ground-truth "correctAnswer".
5. Provide a clear "explanation" for every question explaining why the correct answer is right and why other options are wrong.
6. Extract ALL questions provided in the input text — do NOT cap or truncate the question list.`;
    } else if (mode === 'follow_format') {
      modeInstruction = `MODE: FORMAT & STYLE IMITATION (NEW QUESTIONS FROM TEMPLATE)
CRITICAL RULES FOR FORMAT IMITATION:
1. Analyze the formatting, structure, phrasing style, difficulty level, and domain of the user's sample questions or study material.
2. Generate EXACTLY ${targetCount} BRAND NEW, UNIQUE multiple choice quiz questions that strictly follow that exact same format, style, and structure.
3. Every new question must have 4 distinct multiple choice options.
4. Identify the ground-truth "correctAnswer".
5. Provide a detailed explanation for each question.`;
    } else {
      modeInstruction = `MODE: STUDY MATERIAL SYNTHESIS
Generate EXACTLY ${targetCount} high-quality, comprehensive multiple-choice quiz questions based on the key concepts in the user's provided text.`;
    }

    const systemPrompt = `You are a world-class educational AI quiz architect.
Your job is to analyze the user's text and build a structured, graded multiple-choice quiz.

${modeInstruction}

OUTPUT REQUIREMENTS:
- Output MUST be valid JSON strictly matching the structure below.
- Do not include markdown code block quotes outside JSON.

JSON STRUCTURE:
{
  "title": "Clear Quiz Title",
  "topic": "Concise Topic Tag",
  "questions": [
    {
      "id": "q1",
      "question": "Exact or generated question text?",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": "Option B text",
      "explanation": "Comprehensive explanation of why this option is correct."
    }
  ]
}`;

    const userPrompt = `TOPIC/TITLE OVERRIDE (IF PROVIDED): ${topic || 'Auto-detect from input'}
PREFERRED MODE: ${mode}
${mode !== 'direct_import' ? `TARGET NEW QUESTION COUNT: ${targetCount}` : 'PARSE ALL PASTED QUESTIONS'}

INPUT CONTENT / QUESTIONS:
---
${sourceText.slice(0, 20000)}
---

Generate the quiz JSON now following all instructions.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: mode === 'direct_import' ? 0.2 : 0.7,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawContent);

    const quizTitle = parsed.title || topic || (mode === 'direct_import' ? 'Imported Questions Quiz' : 'AI Generated Quiz');
    const quizTopic = parsed.topic || topic || 'General';
    const questionsList = Array.isArray(parsed.questions) ? parsed.questions : [];

    if (questionsList.length === 0) {
      return NextResponse.json({ error: 'Failed to extract or generate questions from provided content' }, { status: 500 });
    }

    const formattedQuestions = questionsList.map((q: any, idx: number) => {
      const opts = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['True', 'False'];
      const correct = opts.includes(q.correctAnswer) ? q.correctAnswer : opts[0];
      return {
        id: q.id || `q_${idx + 1}`,
        question: q.question || `Question ${idx + 1}`,
        options: opts,
        correctAnswer: correct,
        explanation: q.explanation || 'No detailed explanation provided.'
      };
    });

    const quiz = await prisma.standaloneQuiz.create({
      data: {
        title: quizTitle,
        topic: quizTopic,
        sourceText: sourceText.trim(),
        questions: formattedQuestions
      }
    });


    return NextResponse.json({ success: true, quiz });
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate quiz' }, { status: 500 });
  }
}
