"use server";

import { prisma } from '@/lib/prisma';

export async function getJournalTickers() {
  try {
    const watchlist = await prisma.watchlistItem.findMany({
      select: { ticker: true }
    });
    
    // We can't use distinct easily with Prisma without knowing the exact model structure or using raw,
    // but findMany with distinct is supported:
    const newsTickers = await prisma.newsEvent.findMany({
      select: { ticker: true },
      distinct: ['ticker']
    });

    const watchlisted = watchlist.map(w => w.ticker);
    const others = newsTickers
      .map(n => n.ticker)
      .filter(t => !watchlisted.includes(t));

    return {
      success: true,
      watchlisted,
      others
    };
  } catch (err) {
    console.error(err);
    return { success: false, watchlisted: [], others: [] };
  }
}
