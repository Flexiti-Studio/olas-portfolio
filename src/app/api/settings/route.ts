import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const data = await prisma.setting.findUnique({
      where: { key }
    });

    return NextResponse.json({ value: data?.value || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    const data = await prisma.setting.upsert({
      where: { key },
      update: { value, updated_at: new Date() },
      create: { key, value }
    });

    if (key === 'salary_benchmark') {
      await prisma.financialHistory.create({
        data: {
          netWorth: value.netWorth || 0,
          monthlyIncome: value.monthlyIncome || 0,
        }
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
