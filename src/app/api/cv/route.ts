import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const records = await prisma.cvRecord.findMany({
      orderBy: { updated_at: 'desc' }
    });
      
    // Map snake_case to camelCase
    const formattedRecords = records.map((r: any) => ({
      ...r,
      jobTitle: r.job_title,
      jobDescription: r.job_description,
      templateId: r.template_id,
      currentVersion: r.current_version,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return NextResponse.json(formattedRecords);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
