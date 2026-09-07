import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const quizzes = await prisma.standaloneQuiz.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        attempts: {
          orderBy: { completedAt: 'desc' },
          take: 50
        }
      }
    });

    return NextResponse.json({ success: true, quizzes });
  } catch (error: any) {
    console.error('Fetch quizzes error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quizzes' }, { status: 500 });
  }
}
