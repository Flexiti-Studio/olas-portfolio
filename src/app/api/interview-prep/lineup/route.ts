import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SETTINGS_KEY = 'study_course_lineup';

export async function GET() {
  try {
    const data = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    const lineupIds: string[] = Array.isArray(data?.value) ? (data?.value as string[]) : [];
    return NextResponse.json({ lineupIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, courseId, lineupIds } = body;

    // Direct save of reordered array
    if (Array.isArray(lineupIds)) {
      const updated = await prisma.setting.upsert({
        where: { key: SETTINGS_KEY },
        update: { value: lineupIds, updated_at: new Date() },
        create: { key: SETTINGS_KEY, value: lineupIds },
      });
      return NextResponse.json({ lineupIds: updated.value });
    }

    // Incremental actions: add / remove / toggle
    const current = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    let currentIds: string[] = Array.isArray(current?.value) ? (current?.value as string[]) : [];

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    if (action === 'add' || action === 'start') {
      if (!currentIds.includes(courseId)) {
        currentIds.push(courseId);
      }
    } else if (action === 'remove') {
      currentIds = currentIds.filter(id => id !== courseId);
    } else if (action === 'toggle') {
      if (currentIds.includes(courseId)) {
        currentIds = currentIds.filter(id => id !== courseId);
      } else {
        currentIds.push(courseId);
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: currentIds, updated_at: new Date() },
      create: { key: SETTINGS_KEY, value: currentIds },
    });

    return NextResponse.json({ lineupIds: updated.value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

