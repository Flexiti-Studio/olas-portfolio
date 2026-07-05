import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { quizId, answers, score, passed } = await req.json();

    const attempt = await prisma.quizAttempt.create({
      data: { quiz_id: quizId, answers, score, passed }
    });

    // Update quiz average on progress
    const allAttempts = await prisma.quizAttempt.findMany({
      where: { quiz: { module: { course_id: (await context.params).courseId } } },
      select: { score: true }
    });
    const avg = allAttempts.length ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length) : score;

    await prisma.courseProgress.upsert({
      where: { course_id: (await context.params).courseId },
      create: { course_id: (await context.params).courseId, completed_lessons: [], quiz_average: avg },
      update: { quiz_average: avg, last_studied_at: new Date() }
    });

    return NextResponse.json(attempt);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
