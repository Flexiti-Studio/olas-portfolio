import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    let whereClause: any = {};
    if (stage) whereClause.stage = stage;
    if (tag) whereClause.tags = { has: tag };
    if (search) {
      whereClause.OR = [
        { company: { contains: search, mode: 'insensitive' } },
        { job_title: { contains: search, mode: 'insensitive' } }
      ];
    }

    const data = await prisma.application.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const data = await prisma.application.create({
      data: {
        job_title: body.jobTitle,
        company: body.company,
        stage: body.stage || 'Wishlist',
        source: body.source,
        job_description: body.job_description || null,
        cover_letter_url: body.cover_letter_url || null,
        linked_cv_id: body.linked_cv_id || null,
        linked_cv_slug: body.linked_cv_slug || null,
        created_at: body.created_at ? new Date(body.created_at) : new Date(),
        timeline: [{ event: 'Application Created', date: new Date().toISOString(), auto: true }]
      }
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
