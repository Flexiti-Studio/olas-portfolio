import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const record = await prisma.cvRecord.findUnique({
      where: { slug },
      include: { template: true }
    });

    if (!record) {
      return NextResponse.json({ error: 'CV Record not found' }, { status: 404 });
    }
    
    // Map snake_case to camelCase and handle populated template
    const formattedRecord = {
      ...record,
      jobTitle: record.job_title,
      jobDescription: record.job_description,
      templateId: record.template, // Mongoose populated templateId with the template object
      currentVersion: record.current_version,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
    // Clean up original snake_case properties if desired, but returning them is fine

    return NextResponse.json(formattedRecord);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const record = await prisma.cvRecord.delete({
      where: { slug }
    });

    if (!record) {
      return NextResponse.json({ error: 'CV Record not found or error deleting' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
