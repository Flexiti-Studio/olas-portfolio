import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const MT5TradeSchema = z.object({
  ticket: z.union([z.number(), z.string()]).transform(val => val.toString()),
  symbol: z.string(),
  type: z.string(),
  volume: z.number(),
  openPrice: z.number(),
  closePrice: z.union([z.number(), z.string()]).nullable().optional().transform(val => {
    const num = Number(val);
    return isNaN(num) || num === 0 ? null : num;
  }),
  sl: z.union([z.number(), z.string()]).nullable().optional().transform(val => {
    const num = Number(val);
    return isNaN(num) || num === 0 ? null : num;
  }),
  tp: z.union([z.number(), z.string()]).nullable().optional().transform(val => {
    const num = Number(val);
    return isNaN(num) || num === 0 ? null : num;
  }),
  profit: z.number(),
  openTime: z.string().datetime(),
  closeTime: z.string().nullable().optional().transform(val => {
    if (!val || val === '' || val === '1970-01-01T00:00:00' || val.startsWith('1970')) return null;
    const parsed = Date.parse(val);
    if (isNaN(parsed) || parsed <= 0) return null;
    return val;
  }),
  magicNumber: z.union([z.number(), z.string()]).nullable().optional().transform(val => val ? val.toString() : null),
  comment: z.string().nullable().optional(),
});

const MT5IngestPayloadSchema = z.union([
  MT5TradeSchema,
  z.array(MT5TradeSchema)
]);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.MT5_INGEST_SECRET || authHeader !== `Bearer ${process.env.MT5_INGEST_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      const rawBody = await request.text();
      body = JSON.parse(rawBody.replace(/\0/g, ''));
    } catch (parseErr: any) {
      return NextResponse.json({ error: 'Invalid JSON payload', details: parseErr.message }, { status: 400 });
    }

    const result = MT5IngestPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload', details: result.error.format() }, { status: 400 });
    }

    const trades = Array.isArray(result.data) ? result.data : [result.data];

    const existingTrades = await prisma.mT5Trade.findMany({
      where: { ticket: { in: trades.map(t => t.ticket) } },
      select: { ticket: true, closeTime: true, profit: true, closePrice: true }
    });

    const existingMap = new Map(existingTrades.map(t => [t.ticket, t]));
    
    const tradesToUpsert = trades.filter(trade => {
      const existing = existingMap.get(trade.ticket);
      if (!existing) return true; 
      
      const isExistingClosed = existing.closeTime && existing.closeTime.getFullYear() !== 1970;
      
      if (isExistingClosed && existing.profit === trade.profit && existing.closePrice === trade.closePrice) {
        return false; 
      }
      return true;
    });
    
    const skippedCount = trades.length - tradesToUpsert.length;

    const results = await Promise.allSettled(tradesToUpsert.map(trade => 
      prisma.mT5Trade.upsert({
        where: { ticket: trade.ticket },
        update: {
          symbol: trade.symbol,
          type: trade.type,
          volume: trade.volume,
          openPrice: trade.openPrice,
          closePrice: trade.closePrice,
          profit: trade.profit,
          openTime: new Date(trade.openTime),
          closeTime: trade.closeTime ? new Date(trade.closeTime) : null,
          magicNumber: trade.magicNumber,
          comment: trade.comment,
        },
        create: {
          ticket: trade.ticket,
          symbol: trade.symbol,
          type: trade.type,
          volume: trade.volume,
          openPrice: trade.openPrice,
          closePrice: trade.closePrice,
          profit: trade.profit,
          openTime: new Date(trade.openTime),
          closeTime: trade.closeTime ? new Date(trade.closeTime) : null,
          magicNumber: trade.magicNumber,
          comment: trade.comment,
        }
      })
    ));

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;

    if (errorCount > 0) {
      results.filter(r => r.status === 'rejected').forEach(r => {
        console.error('Error upserting MT5 trade:', (r as PromiseRejectedResult).reason);
      });
    }

    revalidatePath('/mt5-history');

    return NextResponse.json({ 
      success: true, 
      message: `Received ${trades.length} trades: ${successCount} upserted, ${skippedCount} skipped (unchanged), ${errorCount} errors.`,
      total: trades.length,
      successCount,
      skippedCount,
      errorCount
    });

  } catch (error: any) {
    console.error('Error in MT5 ingest route:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}
