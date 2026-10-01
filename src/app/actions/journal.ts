"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function upsertJournalEntry(data: {
  id?: string;
  title?: string | null;
  ticker?: string | null;
  dateStr: string;
  analysis: string;
  entryPlan: string;
  exitPlan: string;
  plannedEntry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  positionSize?: number | null;
  riskPercent?: number | null;
  actualEntry?: number | null;
  actualExit?: number | null;
  realizedPnL?: number | null;
  followedPlan?: boolean | null;
  emotionalState?: string | null;
  confidenceLevel?: string | null;
  lessonLearned?: string;
  notes?: string | null;
  wouldRepeat?: boolean | null;
  images?: string | null;
}) {
  try {
    const targetDate = new Date(data.dateStr);
    
    // Find if exists
    let existing = null;
    if (data.id) {
      existing = await prisma.journalEntry.findUnique({
        where: { id: data.id }
      });
    }

    const payload = {
      title: data.title ?? null,
      analysis: data.analysis,
      entryPlan: data.entryPlan,
      exitPlan: data.exitPlan,
      plannedEntry: data.plannedEntry ?? null,
      stopLoss: data.stopLoss ?? null,
      takeProfit: data.takeProfit ?? null,
      positionSize: data.positionSize ?? null,
      riskPercent: data.riskPercent ?? null,
      actualEntry: data.actualEntry ?? null,
      actualExit: data.actualExit ?? null,
      realizedPnL: data.realizedPnL ?? null,
      followedPlan: data.followedPlan ?? null,
      emotionalState: data.emotionalState ?? null,
      confidenceLevel: data.confidenceLevel ?? null,
      lessonLearned: data.lessonLearned || "",
      notes: data.notes ?? null,
      wouldRepeat: data.wouldRepeat ?? null,
      images: data.images ?? null,
    };

    if (existing) {
      await prisma.journalEntry.update({
        where: { id: existing.id },
        data: payload
      });
    } else {
      await prisma.journalEntry.create({
        data: {
          date: targetDate,
          ticker: data.ticker || null,
          ...payload
        }
      });
    }

    revalidatePath('/watchlist');
    revalidatePath('/journal');
    if (data.ticker) {
      revalidatePath(`/watchlist/${data.ticker}`);
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to upsert journal entry:', err);
    return { success: false, error: 'Failed to save note' };
  }
}
 