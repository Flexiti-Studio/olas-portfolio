import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const quiz = await prisma.standaloneQuiz.findUnique({
      where: { id },
      include: {
        attempts: {
          orderBy: { completedAt: 'desc' }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, quiz });
  } catch (error: any) {
    console.error('Fetch quiz detail error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quiz' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.standaloneQuiz.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error: any) {
    console.error('Delete quiz error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete quiz' }, { status: 500 });
  }
}
