import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        application: { select: { id: true, company: true, job_title: true } },
        progress: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: { orderBy: { order: 'asc' } },
            quiz: { include: { attempts: { orderBy: { completed_at: 'desc' }, take: 1 } } },
            flashcards: { include: { ratings: { orderBy: { rated_at: 'desc' }, take: 1 } } },
          }
        }
      }
    });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    // Ensure progress overall_percentage is accurately aligned with completed lessons
    const totalLessons = course.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 0;
    const completedCount = course.progress?.completed_lessons?.length || 0;
    const calculatedPct = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

    const enrichedCourse = {
      ...course,
      progress: course.progress
        ? {
          ...course.progress,
          overall_percentage: calculatedPct > 0 ? calculatedPct : (course.progress.overall_percentage || 0),
        }
        : {
          overall_percentage: calculatedPct,
          completed_lessons: [],
          quiz_average: 0,
          flashcard_mastery: 0,
        }
    };

    return NextResponse.json(enrichedCourse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const body = await req.json();
    const { modules, activeLessonId, updatedContent } = body;

    if (activeLessonId && updatedContent) {
      await prisma.lesson.update({
        where: { id: activeLessonId },
        data: { content: updatedContent }
      });
      return NextResponse.json({ success: true });
    }

    if (modules && Array.isArray(modules)) {
      for (const mod of modules) {
        if (mod.lessons && Array.isArray(mod.lessons)) {
          for (const les of mod.lessons) {
            if (les.id && les.content) {
              await prisma.lesson.update({
                where: { id: les.id },
                data: { content: les.content }
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update course", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    const body = await req.json();
    const { completed_lessons } = body;

    if (Array.isArray(completed_lessons)) {
      // Fetch total lessons across all modules to calculate overall percentage correctly
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { modules: { select: { _count: { select: { lessons: true } } } } }
      });
      const totalLessons = course?.modules.reduce((acc, m) => acc + (m._count?.lessons || 0), 0) || 1;
      const overallPercentage = Math.min(100, Math.round((completed_lessons.length / totalLessons) * 100));

      const progress = await prisma.courseProgress.upsert({
        where: { course_id: courseId },
        update: {
          completed_lessons,
          overall_percentage: overallPercentage,
          last_studied_at: new Date()
        },
        create: {
          course_id: courseId,
          completed_lessons,
          overall_percentage: overallPercentage,
          last_studied_at: new Date()
        },
      });
      return NextResponse.json(progress);
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await context.params;
    await prisma.course.delete({ where: { id: courseId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

