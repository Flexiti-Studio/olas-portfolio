import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const record = await prisma.companyResearch.findUnique({
      where: { id },
      include: { application: { select: { id: true, company: true, job_title: true } } }
    });
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.companyResearch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const record = await prisma.companyResearch.update({
      where: { id },
      data: {
        snapshot: body.snapshot ?? undefined,
        tech_stack: body.techStack ?? undefined,
        culture: body.culture ?? undefined,
        news: body.news ?? undefined,
        interview_intel: body.interviewIntelligence ?? undefined,
        talking_points: body.talkingPoints ?? undefined,
        competitors: body.competitors ?? undefined,
        sources: body.sources ?? undefined,
        raw_search_data: body.rawSearchData ?? undefined,
        application_id: body.applicationId ?? undefined,
      }
    });

    // Sync application link
    if (body.applicationId !== undefined) {
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
