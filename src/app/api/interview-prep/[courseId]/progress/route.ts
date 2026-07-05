import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const { completedLessonId, currentModuleId, currentLessonId, finalQuizScore, flashcardSessionScore } = await req.json();

    const existing = await prisma.courseProgress.findUnique({ where: { course_id: courseId } });
    const completedLessons = existing?.completed_lessons || [];

    if (completedLessonId && !completedLessons.includes(completedLessonId)) {
      completedLessons.push(completedLessonId);
    }

    // Count total lessons for percentage
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { modules: { select: { _count: { select: { lessons: true } } } } }
    });
    const totalLessons = course?.modules.reduce((acc, m) => acc + m._count.lessons, 0) || 1;
    const overallPercentage = Math.round((completedLessons.length / totalLessons) * 100);

    const updateData: any = {
      completed_lessons: completedLessons,
      current_module_id: currentModuleId || undefined,
      current_lesson_id: currentLessonId || undefined,
      overall_percentage: overallPercentage,
      last_studied_at: new Date(),
    };

    if (typeof finalQuizScore === 'number') {
      updateData.quiz_average = finalQuizScore;
      const historyEntry = { score: finalQuizScore, date: new Date().toISOString() };
      const history = (existing?.assessment_history as any[]) || [];
      updateData.assessment_history = [...history, historyEntry];
    }

    if (typeof flashcardSessionScore === 'number') {
      const historyEntry = { score: flashcardSessionScore, date: new Date().toISOString() };
      const history = (existing?.flashcard_history as any[]) || [];
      updateData.flashcard_history = [...history, historyEntry];
    }

    const progress = await prisma.courseProgress.upsert({
      where: { course_id: courseId },
      create: {
        course_id: courseId,
        completed_lessons: completedLessons,
        current_module_id: currentModuleId,
        current_lesson_id: currentLessonId,
        overall_percentage: overallPercentage,
        quiz_average: typeof finalQuizScore === 'number' ? finalQuizScore : 0,
        assessment_history: typeof finalQuizScore === 'number' ? [{ score: finalQuizScore, date: new Date().toISOString() }] : [],
        flashcard_history: typeof flashcardSessionScore === 'number' ? [{ score: flashcardSessionScore, date: new Date().toISOString() }] : [],
        last_studied_at: new Date(),
      },
      update: updateData
    });

    return NextResponse.json(progress);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
