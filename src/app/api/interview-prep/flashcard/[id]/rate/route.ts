import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { rating, courseId } = await req.json();

    const ratingRecord = await prisma.flashcardRating.create({
      data: { flashcard_id: id, rating }
    });

    // Recalculate mastery if courseId provided
    if (courseId) {
      const allFlashcards = await prisma.flashcard.findMany({
        where: { module: { course_id: courseId } },
        include: { ratings: { orderBy: { rated_at: 'desc' }, take: 1 } }
      });
      const known = allFlashcards.filter(f => f.ratings[0]?.rating === 'know_it').length;
      const mastery = allFlashcards.length ? Math.round((known / allFlashcards.length) * 100) : 0;

      await prisma.courseProgress.upsert({
        where: { course_id: courseId },
        create: { course_id: courseId, completed_lessons: [], flashcard_mastery: mastery },
        update: { flashcard_mastery: mastery }
      });
      
      return NextResponse.json({ ...ratingRecord, mastery });
    }

    return NextResponse.json({ ...ratingRecord, mastery: null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
