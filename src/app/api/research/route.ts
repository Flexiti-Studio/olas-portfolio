import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const records = await prisma.companyResearch.findMany({
      orderBy: { created_at: 'desc' },
      include: { application: { select: { id: true, company: true, job_title: true } } }
    });
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const record = await prisma.companyResearch.create({
      data: {
        company: body.company,
        role: body.role || null,
        depth: body.depth || 'standard',
        snapshot: body.snapshot || null,
        tech_stack: body.techStack || null,
        culture: body.culture || null,
        news: body.news || null,
        interview_intel: body.interviewIntelligence || null,
        talking_points: body.talkingPoints || null,
        competitors: body.competitors || null,
        sources: body.sources || null,
        raw_search_data: body.rawSearchData || null,
        application_id: body.applicationId || null,
      }
    });

    // If linked to an application, update it with the research ID
    if (body.applicationId) {
      await prisma.application.update({
        where: { id: body.applicationId },
        data: { company_research_id: record.id }
      });
    }

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
