import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchRssNews } from '@/lib/news/fetchRssNews';
import { classifyHeadline } from '@/lib/news/classifyHeadline';
import { checkVolumeSignal } from '@/lib/market/checkVolumeSignal';
import { computeScore } from '@/lib/news/computeScore';
import { sendDigest } from '@/lib/email/sendDigest';

import { checkSessionQuality } from '@/lib/market/checkSessionQuality';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const startTime = Date.now();
  
  // 1. Auth Check
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.error('CRON_SECRET is not configured in the environment.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting CRON news ingestion pipeline...');
    
    // 2. Fetch News
    const newsData = await fetchRssNews();
    
    if (!newsData.length) {
      return NextResponse.json({
        message: 'No news found to ingest.',
        fetched: 0,
        successful: 0,
        failed: 0,
        timeMs: Date.now() - startTime
      });
    }

    let successful = 0;
    let failed = 0;
    const today = new Date();

    // 3. Process Each Item
    for (const item of newsData) {
      try {
        const classification = await classifyHeadline(item.ticker, item.headline, item.sourceUrl);
        const { confirmingSignal, hasLiquidity } = await checkVolumeSignal(item.ticker);
        const { isGoodSession } = await checkSessionQuality(item.ticker);
        
        const score = computeScore({
          novelty: classification.novelty,
          confirmingSignal,
          catalystType: classification.catalystType,
          hasLiquidity,
          isGoodSession
        });

        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const existingEvent = await prisma.newsEvent.findFirst({
          where: {
            ticker: item.ticker,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        });

        if (existingEvent) {
          if (score > existingEvent.score) {
            await prisma.newsEvent.update({
              where: { id: existingEvent.id },
              data: {
                headline: item.headline,
                sourceUrl: item.sourceUrl,
                summary: classification.summary,
                catalystType: classification.catalystType,
                novelty: classification.novelty,
                confirmingSignal,
                hasLiquidity,
                isGoodSession,
                score,
              }
            });
          }
        } else {
          await prisma.newsEvent.create({
            data: {
              ticker: item.ticker,
              headline: item.headline,
              sourceUrl: item.sourceUrl,
              summary: classification.summary,
              catalystType: classification.catalystType,
              novelty: classification.novelty,
              sentiment: classification.sentiment,
              confirmingSignal,
              hasLiquidity,
              isGoodSession,
              score,
              createdAt: today
            }
          });
        }
        
        successful++;
      } catch (err) {
        console.error(`Failed to process headline "${item.headline}" for ${item.ticker}:`, err);
        failed++;
        // continue to next item
      }
    }

    // 4. Send Email Digest
    let emailResult = null;
    try {
      console.log('Triggering email digest...');
      emailResult = await sendDigest();
    } catch (err) {
      console.error('Failed to send email digest during cron:', err);
    }

    const timeMs = Date.now() - startTime;
    return NextResponse.json({
      message: 'CRON news ingestion completed.',
      fetched: newsData.length,
      successful,
      failed,
      emailSent: emailResult?.success || false,
      timeMs
    });

  } catch (error) {
    console.error('CRON pipeline critical failure:', error);
    return NextResponse.json({ error: 'Pipeline crashed', details: String(error) }, { status: 500 });
  }
}
