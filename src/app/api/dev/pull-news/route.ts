import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchRssNews } from '@/lib/news/fetchRssNews';
import { classifyHeadline } from '@/lib/news/classifyHeadline';
import { checkVolumeSignal } from '@/lib/market/checkVolumeSignal';
import { computeScore } from '@/lib/news/computeScore';

import { checkSessionQuality } from '@/lib/market/checkSessionQuality';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    console.log('Starting dev pull-news...');
    const newsData = await fetchRssNews();

    if (!newsData.length) {
      return NextResponse.json({ message: 'No news with associated tickers found at this time.', count: 0, data: [] }, { status: 200 });
    }

    const inserted = [];
    const today = new Date();

    for (const item of newsData) {
      // 1. Classify via Groq
      const classification = await classifyHeadline(item.ticker, item.headline, item.sourceUrl);

      // 2. Volume signal check
      const { confirmingSignal, hasLiquidity } = await checkVolumeSignal(item.ticker);
      const { isGoodSession } = await checkSessionQuality(item.ticker);

      // 3. Score compute
      const score = computeScore({
        novelty: classification.novelty,
        confirmingSignal,
        catalystType: classification.catalystType,
        hasLiquidity,
        isGoodSession
      });

      // 4. DB Insert
      const result = await prisma.newsEvent.create({
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
      inserted.push(result);
    }

    return NextResponse.json({
      message: 'Pulled news from RSS feeds successfully.',
      count: inserted.length,
      data: inserted
    });
  } catch (error) {
    console.error('Failed to pull news:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
