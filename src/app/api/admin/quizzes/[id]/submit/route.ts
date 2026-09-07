import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { answers } = await req.json();

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Answers object is required' }, { status: 400 });
    }

    const quiz = await prisma.standaloneQuiz.findUnique({ where: { id } });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const questions = Array.isArray(quiz.questions) ? quiz.questions as any[] : [];
    let correctCount = 0;
    const totalCount = questions.length;

    // Grade answers
    const gradedQuestions = questions.map((q: any) => {
      const selected = answers[q.id];
      const isCorrect = selected && selected.trim() === q.correctAnswer?.trim();
      if (isCorrect) correctCount++;
      return {
        ...q,
        userAnswer: selected || null,
        isCorrect: !!isCorrect,
      };
    });

    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const passed = score >= 70;

    // Save attempt to DB first (fast, non-blocking for user)
    const attempt = await prisma.standaloneQuizAttempt.create({
      data: {
        quizId: id,
        answers: answers,
        score,
        correctCount,
        totalCount,
        passed,
      }
    });

    // Generate AI explanations for each question after grading
    let questionsWithExplanations = gradedQuestions;

    try {
      const promptLines = gradedQuestions.map((q: any, i: number) => {
        const userAns = q.userAnswer ? `"${q.userAnswer}"` : 'did not answer';
        return `Q${i + 1}: ${q.question}
Options: ${q.options.join(' | ')}
Correct Answer: ${q.correctAnswer}
Student Selected: ${userAns}
Result: ${q.isCorrect ? 'CORRECT' : 'INCORRECT'}`;
      }).join('\n\n');

      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: `You are a helpful tutor. For each question below, write a SHORT (2-3 sentence) explanation.
If the student got it CORRECT, briefly reinforce why their answer is right.
If the student got it WRONG, explain why the correct answer is right and why their answer was incorrect.
Be direct, clear, and educational. Use plain language.
Respond with a JSON array of objects in this exact format:
[{"id": "q_index_0", "explanation": "..."}, {"id": "q_index_1", "explanation": "..."}, ...]
Use the same zero-based index as the question number (Q1 = index 0, Q2 = index 1, etc).`
          },
          {
            role: 'user',
            content: `Quiz topic: ${quiz.topic || 'General'}\n\n${promptLines}`
          }
        ]
      });

      const raw = aiRes.choices[0]?.message?.content || '[]';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const explanations: { id: string; explanation: string }[] = JSON.parse(jsonMatch[0]);
        questionsWithExplanations = gradedQuestions.map((q: any, i: number) => {
          const exp = explanations.find(e => e.id === `q_index_${i}`);
          return {
            ...q,
            explanation: exp?.explanation || q.explanation || 'No explanation available.'
          };
        });
      }
    } catch (aiErr) {
      console.error('AI explanation generation failed (non-fatal):', aiErr);
      // Fall back to stored explanations if AI fails
    }

    return NextResponse.json({
      success: true,
      attempt,
      score,
      correctCount,
      totalCount,
      passed,
      questions: questionsWithExplanations,
    });
  } catch (error: any) {
    console.error('Submit quiz error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit quiz answers' }, { status: 500 });
  }
}
