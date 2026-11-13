import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        progress: true,
        application: { select: { id: true, company: true, job_title: true } },
        modules: { select: { id: true, _count: { select: { lessons: true } } } },
      }
    });

    // Ensure overall_percentage accurately reflects completed_lessons in real-time
    const enriched = courses.map(c => {
      const totalLessons = c.modules?.reduce((acc: number, m: any) => acc + (m._count?.lessons || 0), 0) || 0;
      const completedCount = c.progress?.completed_lessons?.length || 0;
      const calculatedPct = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

      return {
        ...c,
        progress: c.progress
          ? {
            ...c.progress,
            overall_percentage: calculatedPct > 0 ? calculatedPct : (c.progress.overall_percentage || 0),
          }
          : {
            overall_percentage: calculatedPct,
            completed_lessons: [],
            quiz_average: 0,
            flashcard_mastery: 0,
          }
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, sourceType, sourceText, focusAreas, depth, estimatedDuration, applicationId, modules } = body;

    const safeModules = Array.isArray(modules) ? modules : [];

    const course = await prisma.course.create({
      data: {
        title: title || 'Untitled Course',
        description: description || '',
        source_type: sourceType || 'text',
        source_text: sourceText || '',
        focus_areas: focusAreas || [],
        depth: depth || 'standard',
        estimated_duration: estimatedDuration || '',
        application_id: applicationId || null,
        modules: {
          create: safeModules.map((mod: any, mIndex: number) => ({
            title: mod.title || `Module ${mIndex + 1}`,
            description: mod.description || '',
            order: parseInt(mod.order) || mIndex + 1,
            lessons: {
              create: (Array.isArray(mod.lessons) ? mod.lessons : []).map((lesson: any, lIndex: number) => ({
                title: lesson.title || `Lesson ${lIndex + 1}`,
                order: parseInt(lesson.order) || lIndex + 1,
                estimated_minutes: parseInt(lesson.estimatedMinutes) || 5,
                content: lesson.content || {},
              }))
            },
            quiz: mod.quiz?.questions?.length ? {
              create: { questions: mod.quiz.questions }
            } : undefined,
            flashcards: {
              create: (Array.isArray(mod.flashcards) ? mod.flashcards : []).map((fc: any) => ({
                front: fc.front || 'Front',
                back: fc.back || 'Back',
              }))
            }
          }))
        },
        progress: {
          create: {
            completed_lessons: [],
            overall_percentage: 0,
            flashcard_mastery: 0,
            quiz_average: 0,
          }
        }
      },
      include: { modules: { include: { lessons: true, quiz: true, flashcards: true } }, progress: true }
    });

    return NextResponse.json(course);
  } catch (error: any) {
    console.error("Course Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
