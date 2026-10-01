"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type TradingStrategyData = {
  id?: string;
  name: string;
  status?: string;
  
  targetCondition?: string | null;
  edge?: string | null;
  instruments?: string | null;
  timeframes?: string | null;
  timeframeBias?: string | null;
  checklist?: string | null;
  
  requiredStructure?: string | null;
  confirmingSignals?: string | null;
  fundamentalBackdrop?: string | null;
  skipChecklist?: string | null;
  
  triggerCondition?: string | null;
  entryMethod?: string | null;
  
  stopLossLogic?: string | null;
  takeProfitLogic?: string | null;
  invalidation?: string | null;
  
  maxRiskPerTrade?: number | null;
  maxConcurrent?: number | null;
  correlationRules?: string | null;
  
  sampleSize?: number | null;
  winRate?: number | null;
  averageR?: number | null;
  expectancy?: number | null;
  weaknesses?: string | null;
  images?: string | null;
};

export async function upsertTradingStrategy(data: TradingStrategyData) {
  try {
    let existing = null;
    if (data.id) {
      existing = await prisma.tradingStrategy.findUnique({
        where: { id: data.id }
      });
    }

    const payload = {
      name: data.name,
      status: data.status || 'testing',
      targetCondition: data.targetCondition || null,
      edge: data.edge || null,
      instruments: data.instruments || null,
      timeframes: data.timeframes || null,
      timeframeBias: data.timeframeBias || null,
      checklist: data.checklist || null,
      requiredStructure: data.requiredStructure || null,
      confirmingSignals: data.confirmingSignals || null,
      fundamentalBackdrop: data.fundamentalBackdrop || null,
      skipChecklist: data.skipChecklist || null,
      triggerCondition: data.triggerCondition || null,
      entryMethod: data.entryMethod || null,
      stopLossLogic: data.stopLossLogic || null,
      takeProfitLogic: data.takeProfitLogic || null,
      invalidation: data.invalidation || null,
      maxRiskPerTrade: data.maxRiskPerTrade || null,
      maxConcurrent: data.maxConcurrent || null,
      correlationRules: data.correlationRules || null,
      sampleSize: data.sampleSize || null,
      winRate: data.winRate || null,
      averageR: data.averageR || null,
      expectancy: data.expectancy || null,
      weaknesses: data.weaknesses || null,
      images: data.images || null,
    };

    let result;
    if (existing) {
      result = await prisma.tradingStrategy.update({
        where: { id: existing.id },
        data: payload
      });
    } else {
      result = await prisma.tradingStrategy.create({
        data: payload
      });
    }
    
    revalidatePath('/trading/strategy');
    revalidatePath(`/trading/strategy/${result.id}`);
    
    return { success: true, strategy: result };
  } catch (error: any) {
    console.error("Error upserting trading strategy:", error);
    return { success: false, error: error.message };
  }
}
