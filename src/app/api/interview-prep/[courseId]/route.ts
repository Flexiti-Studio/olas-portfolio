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
    return NextResponse.json(course);
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
      await prisma.courseProgress.upsert({
        where: { course_id: courseId },
        update: { completed_lessons },
        create: { course_id: courseId, completed_lessons },
      });
      return NextResponse.json({ success: true });
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

