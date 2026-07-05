import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.slug || !data.jobTitle || !data.company) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      slug: data.slug,
      job_title: data.jobTitle,
      company: data.company,
      job_description: data.jobDescription,
      instructions: data.instructions,
      tone: data.tone,
      template_id: data.templateId,
      versions: data.versions || [],
      current_version: data.currentVersion || 0,
      status: data.status || 'draft',
      updated_at: new Date(),
    };

    const record = await prisma.cvRecord.upsert({
      where: { slug: payload.slug },
      update: payload,
      create: payload
    });

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
