"use server";

import { prisma, withPrismaRetry } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';
import openai from '@/lib/openai';
import { calculateTradeMetrics } from '@/lib/ea-lab/metrics';
import {
  createStrategySchema,
  createVersionSchema,
  updateVersionSchema,
  updateVersionCodeSchema,
  deleteVersionSchema,
  saveTestRunSchema,
  updateTestRunSchema,
  deleteTestRunSchema,
  upsertDayJournalSchema,
  upsertPairNoteSchema,
  updateTradeProfitSchema,
} from '@/lib/ea-lab/schemas';

import { serializeCategoryDescription, deserializeCategoryDescription } from '@/lib/ea-lab/categories';

/**
 * Fetches the raw Strategy Tester log for a specific test run on-demand.
 * This keeps the main strategy page payload tiny and prevents transfer freezes.
 */
export async function getTestRunRawLog(runId: string) {
  try {
    const run = await withPrismaRetry(() =>
      prisma.eaTestRun.findUnique({
        where: { id: runId },
        select: { rawLog: true },
      })
    );
    return run?.rawLog || '';
  } catch (err: any) {
    console.error('Error fetching raw log:', err);
    return '';
  }
}

/**
 * Creates a new EA Strategy.
 */
export async function createEaStrategy(input: z.infer<typeof createStrategySchema>) {
  try {
    const validated = createStrategySchema.parse(input);
    const combinedDesc = serializeCategoryDescription(validated.category, validated.description);
    const strategy = await prisma.eaStrategy.create({
      data: {
        name: validated.name.trim(),
        description: combinedDesc,
      },
    });

    revalidatePath('/trading/ea-lab');
    return { success: true, strategy };
  } catch (error: any) {
    console.error('Error creating strategy:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates an EA Strategy's category.
 */
export async function updateEaStrategyCategory(strategyId: string, category: string | null) {
  try {
    const existing = await prisma.eaStrategy.findUnique({
      where: { id: strategyId },
      select: { description: true },
    });
    const { description: rawUserDesc } = deserializeCategoryDescription(existing?.description);
    const newDescription = serializeCategoryDescription(category, rawUserDesc);

    const strategy = await prisma.eaStrategy.update({
      where: { id: strategyId },
      data: {
        description: newDescription,
      },
    });

    revalidatePath('/trading/ea-lab');
    revalidatePath(`/trading/ea-lab/${strategyId}`);
    return { success: true, strategy };
  } catch (error: any) {
    console.error('Error updating strategy category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new code version for an EA strategy.
 * Computes SHA-256 hash and checks if it duplicates an existing version.
 */
export async function createEaVersion(input: z.infer<typeof createVersionSchema>) {
  try {
    const validated = createVersionSchema.parse(input);
    const codeHash = crypto.createHash('sha256').update(validated.code).digest('hex');

    // Check for duplicate code hash under this strategy
    const existingSameHash = await prisma.eaVersion.findFirst({
      where: {
        strategyId: validated.strategyId,
        codeHash,
      },
      select: { id: true, label: true },
    });

    const isDuplicate = Boolean(existingSameHash);
    const duplicateWarning = isDuplicate
      ? `Warning: This code is identical to existing version ${existingSameHash?.label} (Hash: ${codeHash.slice(0, 8)}...).`
      : null;

    const version = await prisma.eaVersion.create({
      data: {
        strategyId: validated.strategyId,
        label: validated.label.trim(),
        code: validated.code,
        codeHash,
        changeNotes: validated.changeNotes?.trim() || null,
      },
    });

    revalidatePath(`/trading/ea-lab/${validated.strategyId}`);
    return { success: true, version, isDuplicate, duplicateWarning };
  } catch (error: any) {
    console.error('Error creating version:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates an existing code version's label/name and change notes.
 */
export async function updateEaVersion(input: z.infer<typeof updateVersionSchema>) {
  try {
    const validated = updateVersionSchema.parse(input);
    const updated = await prisma.eaVersion.update({
      where: { id: validated.versionId },
      data: {
        label: validated.label.trim(),
        changeNotes: validated.changeNotes?.trim() || null,
      },
    });

    revalidatePath(`/trading/ea-lab/${validated.strategyId}`);
    return { success: true, version: updated };
  } catch (error: any) {
    console.error('Error updating version:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates the source code of an existing EA version, recomputing the SHA-256 hash.
 */
export async function updateEaVersionCode(input: z.infer<typeof updateVersionCodeSchema>) {
  try {
    const validated = updateVersionCodeSchema.parse(input);
    const codeHash = crypto.createHash('sha256').update(validated.code).digest('hex');

    const updated = await prisma.eaVersion.update({
      where: { id: validated.versionId },
      data: {
        code: validated.code,
        codeHash,
        changeNotes: validated.changeNotes !== undefined ? (validated.changeNotes?.trim() || null) : undefined,
      },
    });

    revalidatePath(`/trading/ea-lab/${validated.strategyId}`);
    return { success: true, version: updated };
  } catch (error: any) {
    console.error('Error updating version code:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes an existing EA code version.
 */
export async function deleteEaVersion(input: z.infer<typeof deleteVersionSchema>) {
  try {
    const validated = deleteVersionSchema.parse(input);

    const existing = await prisma.eaVersion.findUnique({
      where: { id: validated.versionId },
      select: { id: true, strategyId: true, label: true },
    });

    if (!existing) {
      return { success: false, error: 'Code version not found' };
    }

    await prisma.eaVersion.delete({
      where: { id: validated.versionId },
    });

    revalidatePath(`/trading/ea-lab/${existing.strategyId}`);
    revalidatePath('/trading/ea-lab');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting code version:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves a parsed test run and its trades inside a database transaction.
 */
export async function saveEaTestRun(input: z.infer<typeof saveTestRunSchema>) {
  try {
    const validated = saveTestRunSchema.parse(input);

    // Compute metric columns deterministically
    const metricCalc = calculateTradeMetrics(
      validated.trades,
      validated.initialDeposit,
      validated.finalBalance
    );

    const testedAt = validated.testedAt ? new Date(validated.testedAt) : new Date();

    // Use Prisma nested atomic create for test run + trades wrapped in resilient retry
    const testRun = await withPrismaRetry(() =>
      prisma.eaTestRun.create({
        data: {
          strategyId: validated.strategyId,
          versionId: validated.versionId,
          testedAt,
          symbol: validated.symbol,
          timeframe: validated.timeframe || null,
          periodFrom: validated.periodFrom ? new Date(validated.periodFrom) : null,
          periodTo: validated.periodTo ? new Date(validated.periodTo) : null,
          initialDeposit: validated.initialDeposit,
          currency: validated.currency,
          leverage: validated.leverage,
          finalBalance: validated.finalBalance,
          inputsJson: validated.inputsJson,
          rawLog: validated.rawLog,
          journal: validated.journal || null,
          // Computed metric columns
          netProfit: metricCalc.netProfit,
          returnPct: metricCalc.returnPct,
          tradesCount: metricCalc.tradesCount,
          winRate: metricCalc.winRate,
          profitFactor: metricCalc.profitFactor,
          avgR: metricCalc.avgR,
          maxDrawdownR: metricCalc.maxDrawdownR,
          maxConsecLosses: metricCalc.maxConsecLosses,
          tpCount: metricCalc.exitSplit.TP,
          slCount: metricCalc.exitSplit.SL,
          errorCount: validated.errorCount,
          breakCount: validated.breakCount,
          retestCount: validated.retestCount,
          skipCounts: validated.skipCounts,
          trades:
            validated.trades.length > 0
              ? {
                  create: validated.trades.map((t) => ({
                    ticket: t.ticket || null,
                    openedAt: t.openedAt ? new Date(t.openedAt) : null,
                    closedAt: t.closedAt ? new Date(t.closedAt) : null,
                    direction: t.direction,
                    lots: t.lots,
                    entry: t.entry,
                    sl: t.sl != null ? t.sl : null,
                    tp: t.tp != null ? t.tp : null,
                    exitPrice: t.exitPrice != null ? t.exitPrice : null,
                    exitReason: t.exitReason || null,
                    tag: t.tag || null,
                    rMultiple: t.rMultiple != null ? t.rMultiple : null,
                    profit: t.profit != null ? t.profit : null,
                  })),
                }
              : undefined,
        },
      })
    );

    // Ensure the tested pair is permanently stored in the pairs table (ea_pair_notes)
    if (validated.symbol && validated.symbol.trim() !== '' && validated.symbol !== 'UNKNOWN') {
      try {
        await withPrismaRetry(() =>
          prisma.eaPairNote.upsert({
            where: {
              strategyId_symbol: {
                strategyId: validated.strategyId,
                symbol: validated.symbol.trim(),
              },
            },
            update: {},
            create: {
              strategyId: validated.strategyId,
              symbol: validated.symbol.trim(),
              notes: '',
            },
          })
        );
      } catch (pairErr) {
        console.warn('Could not upsert eaPairNote during test run save:', pairErr);
      }
    }

    revalidatePath(`/trading/ea-lab/${validated.strategyId}`);
    revalidatePath('/trading/ea-lab');
    return {
      success: true,
      testRun: {
        id: testRun.id,
        strategyId: testRun.strategyId,
        symbol: testRun.symbol,
        tradesCount: testRun.tradesCount,
      },
    };
  } catch (error: any) {
    console.error('Error saving test run in transaction:', error);
    const isConnErr =
      error?.code === 'P1001' ||
      error?.message?.includes("Can't reach database server");
    const userMsg = isConnErr
      ? 'Database connection temporarily lost. Please check your network and click Save again.'
      : (error.message || 'Failed to save backtest run');
    return { success: false, error: userMsg };
  }
}

/**
 * Updates an existing EA Test Run (and optionally replaces/updates trades).
 */
export async function updateEaTestRun(input: z.infer<typeof updateTestRunSchema>) {
  try {
    const validated = updateTestRunSchema.parse(input);

    const existingRun = await prisma.eaTestRun.findUnique({
      where: { id: validated.runId },
      include: { trades: true },
    });

    if (!existingRun) {
      return { success: false, error: 'Test run not found' };
    }

    const testedAt = validated.testedAt ? new Date(validated.testedAt) : existingRun.testedAt;
    const tradesToCompute = validated.trades ?? existingRun.trades;

    // Deterministically recompute metrics
    const metricCalc = calculateTradeMetrics(
      tradesToCompute as any,
      validated.initialDeposit,
      validated.finalBalance
    );

    // If new trades array was explicitly provided, replace existing trades
    if (validated.trades && Array.isArray(validated.trades)) {
      await prisma.eaTrade.deleteMany({
        where: { testRunId: validated.runId },
      });

      if (validated.trades.length > 0) {
        await prisma.eaTrade.createMany({
          data: validated.trades.map((t) => ({
            testRunId: validated.runId,
            ticket: t.ticket || null,
            openedAt: t.openedAt ? new Date(t.openedAt) : null,
            closedAt: t.closedAt ? new Date(t.closedAt) : null,
            direction: t.direction,
            lots: t.lots,
            entry: t.entry,
            sl: t.sl != null ? t.sl : null,
            tp: t.tp != null ? t.tp : null,
            exitPrice: t.exitPrice != null ? t.exitPrice : null,
            exitReason: t.exitReason || null,
            tag: t.tag || null,
            rMultiple: t.rMultiple != null ? t.rMultiple : null,
            profit: t.profit != null ? t.profit : null,
          })),
        });
      }
    }

    const updated = await prisma.eaTestRun.update({
      where: { id: validated.runId },
      data: {
        versionId: validated.versionId || existingRun.versionId,
        testedAt,
        symbol: validated.symbol,
        timeframe: validated.timeframe ?? existingRun.timeframe,
        periodFrom: validated.periodFrom ? new Date(validated.periodFrom) : existingRun.periodFrom,
        periodTo: validated.periodTo ? new Date(validated.periodTo) : existingRun.periodTo,
        initialDeposit: validated.initialDeposit,
        currency: validated.currency,
        leverage: validated.leverage,
        finalBalance: validated.finalBalance,
        journal: validated.journal !== undefined ? validated.journal : existingRun.journal,
        rawLog: validated.rawLog !== undefined ? validated.rawLog : existingRun.rawLog,
        // Recomputed metrics
        netProfit: metricCalc.netProfit,
        returnPct: metricCalc.returnPct,
        tradesCount: metricCalc.tradesCount,
        winRate: metricCalc.winRate,
        profitFactor: metricCalc.profitFactor,
        avgR: metricCalc.avgR,
        maxDrawdownR: metricCalc.maxDrawdownR,
        maxConsecLosses: metricCalc.maxConsecLosses,
        tpCount: metricCalc.exitSplit.TP,
        slCount: metricCalc.exitSplit.SL,
      },
    });

    // Ensure the updated pair is permanently stored in the pairs table (ea_pair_notes)
    if (validated.symbol && validated.symbol.trim() !== '' && validated.symbol !== 'UNKNOWN') {
      try {
        await withPrismaRetry(() =>
          prisma.eaPairNote.upsert({
            where: {
              strategyId_symbol: {
                strategyId: existingRun.strategyId,
                symbol: validated.symbol.trim(),
              },
            },
            update: {},
            create: {
              strategyId: existingRun.strategyId,
              symbol: validated.symbol.trim(),
              notes: '',
            },
          })
        );
      } catch (pairErr) {
        console.warn('Could not upsert eaPairNote during test run update:', pairErr);
      }
    }

    revalidatePath(`/trading/ea-lab/${existingRun.strategyId}`);
    revalidatePath('/trading/ea-lab');
    return {
      success: true,
      testRun: {
        id: updated.id,
        strategyId: updated.strategyId,
        symbol: updated.symbol,
        tradesCount: updated.tradesCount,
      },
    };
  } catch (error: any) {
    console.error('Error updating test run:', error);
    const isConnErr =
      error?.code === 'P1001' ||
      error?.message?.includes("Can't reach database server");
    const userMsg = isConnErr
      ? 'Database connection temporarily lost. Please check your network and try again.'
      : (error.message || 'Failed to update backtest run');
    return { success: false, error: userMsg };
  }
}

/**
 * Deletes an existing EA Test Run.
 */
export async function deleteEaTestRun(input: z.infer<typeof deleteTestRunSchema>) {
  try {
    const validated = deleteTestRunSchema.parse(input);

    const existingRun = await prisma.eaTestRun.findUnique({
      where: { id: validated.runId },
      select: { strategyId: true },
    });

    if (!existingRun) {
      return { success: false, error: 'Test run not found' };
    }

    await prisma.eaTestRun.delete({
      where: { id: validated.runId },
    });

    revalidatePath(`/trading/ea-lab/${existingRun.strategyId}`);
    revalidatePath('/trading/ea-lab');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting test run:', error);
    return { success: false, error: error.message };
  }
}


/**
 * Updates a trade's manual profit and/or exit details.
 */
export async function updateTradeProfit(input: z.infer<typeof updateTradeProfitSchema>) {
  try {
    const validated = updateTradeProfitSchema.parse(input);

    const updated = await prisma.eaTrade.update({
      where: { id: validated.tradeId },
      data: {
        profit: validated.profit,
      },
      include: {
        testRun: true,
      },
    });

    if (updated.testRun?.strategyId) {
      revalidatePath(`/trading/ea-lab/${updated.testRun.strategyId}`);
    }

    return { success: true, trade: updated };
  } catch (error: any) {
    console.error('Error updating trade profit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upserts day journal for a strategy on a specific date (YYYY-MM-DD in Africa/Lagos).
 */
export async function upsertDayJournal(input: z.infer<typeof upsertDayJournalSchema>) {
  try {
    const validated = upsertDayJournalSchema.parse(input);

    const dayJournal = await prisma.eaDayJournal.upsert({
      where: {
        strategyId_date: {
          strategyId: validated.strategyId,
          date: validated.date,
        },
      },
      update: {
        notes: validated.notes,
      },
      create: {
        strategyId: validated.strategyId,
        date: validated.date,
        notes: validated.notes,
      },
    });

    revalidatePath(`/trading/ea-lab/${validated.strategyId}`);
    return { success: true, dayJournal };
  } catch (error: any) {
    console.error('Error upserting day journal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upserts notes for a specific symbol/pair under a strategy.
 */
export async function upsertPairNote(input: z.infer<typeof upsertPairNoteSchema>) {
  try {
    const validated = upsertPairNoteSchema.parse(input);

    const pairNote = await prisma.eaPairNote.upsert({
      where: {
        strategyId_symbol: {
          strategyId: validated.strategyId,
          symbol: validated.symbol,
        },
      },
      update: {
        notes: validated.notes,
      },
      create: {
        strategyId: validated.strategyId,
        symbol: validated.symbol,
        notes: validated.notes,
      },
    });

    revalidatePath(`/trading/ea-lab/${validated.strategyId}`);
    return { success: true, pairNote };
  } catch (error: any) {
    console.error('Error upserting pair note:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generates an AI summary using ONLY computed stats and journal notes.
 * CRITICAL: Never sends raw code.
 */
export async function generateAiSummary(payload: {
  strategyName: string;
  stats: Record<string, any>;
  journals: string[];
  warnings: string[];
  verdict: string;
}) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: true,
        summary: `### Strategy Review: ${payload.strategyName}
**Verdict**: ${payload.verdict}
**Summary**: Strategy shows ${payload.stats.tradesCount || 0} trades with a win rate of ${payload.stats.winRate || 0}% and an expectancy of ${payload.stats.avgR || 0}R.
${payload.warnings.length > 0 ? `\n**Key Alerts**:\n- ${payload.warnings.join('\n- ')}` : ''}
*(Set OPENAI_API_KEY to enable full live LLM synthesis)*`,
      };
    }

    const prompt = `You are a quantitative trading systems researcher.
Analyze this MetaTrader 5 Expert Advisor Strategy backtest report.
DO NOT invent raw numbers; use the provided metrics and trader notes.

Strategy Name: ${payload.strategyName}
Current Verdict: ${payload.verdict}
Key Metrics:
${JSON.stringify(payload.stats, null, 2)}

Active Warnings:
${payload.warnings.length > 0 ? payload.warnings.join('\n') : 'None'}

Trader Backtest Journal Notes:
${payload.journals.length > 0 ? payload.journals.join('\n---\n') : 'No journal notes provided yet.'}

Provide a concise, highly actionable evaluation:
1. Verdict & Core Strengths: What the numbers prove.
2. Fragility & Risk Points: What could break in live trading (e.g. execution errors, drawdown streaks, single-pair bias).
3. Next Optimization Steps: Concrete tester tests or code refinements to perform next.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert algorithmic trading evaluator. Provide structured, insightful analysis in markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content || 'Unable to generate summary.';
    return { success: true, summary };
  } catch (error: any) {
    console.error('Error generating AI summary:', error);
    return { success: false, error: error.message };
  }
}
