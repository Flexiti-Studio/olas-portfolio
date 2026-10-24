import { NextRequest, NextResponse } from 'next/server';
import { prisma, withPrismaRetry } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await withPrismaRetry(() =>
      prisma.fsProject.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: { version: 'asc' },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    );

    if (!project) {
      return NextResponse.json({ project: null }, { status: 200 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching flexStrategy project:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      symbol,
      timeframe,
      chartDrawings,
      activeParams,
      strategy,
      version,
      messages,
    } = body;

    // Upsert project
    const project = await withPrismaRetry(() =>
      prisma.fsProject.upsert({
        where: { id },
        update: {
          name: name || undefined,
          symbol: symbol || undefined,
          timeframe: timeframe || undefined,
          chartDrawings: chartDrawings !== undefined ? chartDrawings : undefined,
        },
        create: {
          id,
          name: name || `Strategy Project #${id.slice(-4)}`,
          symbol: symbol || 'XAUUSD',
          timeframe: timeframe || '5m',
          chartDrawings: chartDrawings || undefined,
        },
      })
    );

    // If a strategy version is supplied, upsert it
    if (strategy && version) {
      await withPrismaRetry(() =>
        prisma.fsStrategyVersion.upsert({
          where: {
            projectId_version: {
              projectId: id,
              version: Number(version),
            },
          },
          update: {
            name: strategy.name || 'Strategy',
            paramsSchema: strategy.params || [],
            params: activeParams || {},
            code: strategy.code || '',
          },
          create: {
            projectId: id,
            version: Number(version),
            name: strategy.name || 'Strategy',
            paramsSchema: strategy.params || [],
            params: activeParams || {},
            code: strategy.code || '',
            createdBy: 'user',
          },
        })
      );
    }

    // If chat messages are provided, ensure they are stored
    if (Array.isArray(messages) && messages.length > 0) {
      // Find existing message IDs to avoid duplicates
      const existing = await withPrismaRetry(() =>
        prisma.fsChatMessage.findMany({
          where: { projectId: id },
          select: { id: true },
        })
      );
      const existingIds = new Set(existing.map((m) => m.id));

      const newMessages = messages.filter((m) => m.id && !existingIds.has(m.id));

      if (newMessages.length > 0) {
        await withPrismaRetry(() =>
          prisma.fsChatMessage.createMany({
            data: newMessages.map((m) => ({
              id: m.id,
              projectId: id,
              role: m.role || 'user',
              content: m.content || '',
              toolStatus: m.toolStatus || null,
              versionCreated: m.versionCreated || null,
            })),
          })
        );
      }
    }

    return NextResponse.json({ success: true, project }, { status: 200 });
  } catch (error: any) {
    console.error('Error saving flexStrategy project:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save project' },
      { status: 500 }
    );
  }
}
