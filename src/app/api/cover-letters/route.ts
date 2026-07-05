import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const records = await prisma.coverLetter.findMany({
      orderBy: { updated_at: 'desc' }
    });
      
    // Map snake_case to camelCase
    const formattedRecords = records.map((r: any) => ({
      ...r,
      applicationId: r.application_id,
      linkedCvId: r.linked_cv_id,
      linkedCvSlug: r.linked_cv_slug,
      jobTitle: r.job_title,
      jobDescription: r.job_description,
      hiringManager: r.hiring_manager,
      customInstructions: r.custom_instructions,
      currentVersion: r.current_version,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return NextResponse.json(formattedRecords);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Create a unique slug
    const baseSlug = `${body.jobTitle}-${body.company}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const record = await prisma.coverLetter.create({
      data: {
        slug: baseSlug,
        company: body.company,
        job_title: body.jobTitle,
        job_description: body.jobDescription,
        tone: body.tone,
        versions: [body.text],
        current_version: 0,
        status: 'draft',
        application_id: body.applicationId || null
      }
    });

    // Auto-attach to application if applicationId is provided
    if (body.applicationId) {
      await prisma.application.update({
        where: { id: body.applicationId },
        data: { cover_letter_url: record.id }
      });
    }

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
