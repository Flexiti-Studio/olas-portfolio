import { z } from 'zod';

export const createStrategySchema = z.object({
  name: z.string().min(1, 'Strategy name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const createVersionSchema = z.object({
  strategyId: z.string().min(1, 'Strategy ID is required'),
  label: z.string().min(1, 'Version label is required'),
  code: z.string().min(1, 'Code is required'),
  changeNotes: z.string().optional(),
});

export const updateVersionSchema = z.object({
  versionId: z.string().min(1, 'Version ID is required'),
  strategyId: z.string().min(1, 'Strategy ID is required'),
  label: z.string().min(1, 'Version label is required'),
  changeNotes: z.string().optional().nullable(),
});

export const updateVersionCodeSchema = z.object({
  versionId: z.string().min(1, 'Version ID is required'),
  strategyId: z.string().min(1, 'Strategy ID is required'),
  code: z.string().min(1, 'Code is required'),
  changeNotes: z.string().optional().nullable(),
});

export const tradeInputSchema = z.object({
  ticket: z.string().optional().nullable(),
  openedAt: z.union([z.string(), z.date()]).optional().nullable(),
  closedAt: z.union([z.string(), z.date()]).optional().nullable(),
  direction: z.string(),
  lots: z.number(),
  entry: z.number(),
  sl: z.number().optional().nullable(),
  tp: z.number().optional().nullable(),
  exitPrice: z.number().optional().nullable(),
  exitReason: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
  rMultiple: z.number().optional().nullable(),
  profit: z.number().optional().nullable(),
});

export const saveTestRunSchema = z.object({
  strategyId: z.string().min(1),
  versionId: z.string().min(1),
  testedAt: z.union([z.string(), z.date()]).optional(),
  symbol: z.string().min(1),
  timeframe: z.string().optional().nullable(),
  periodFrom: z.union([z.string(), z.date()]).optional().nullable(),
  periodTo: z.union([z.string(), z.date()]).optional().nullable(),
  initialDeposit: z.number().default(10000),
  currency: z.string().default('USD'),
  leverage: z.string().default('1:100'),
  finalBalance: z.number().default(10000),
  inputsJson: z.record(z.string(), z.any()).default({}),
  rawLog: z.string(),
  journal: z.string().optional().nullable(),
  trades: z.array(tradeInputSchema).default([]),
  skipCounts: z.record(z.string(), z.any()).default({}),
  errorCount: z.number().default(0),
  breakCount: z.number().default(0),
  retestCount: z.number().default(0),
});

export const upsertDayJournalSchema = z.object({
  strategyId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  notes: z.string(),
});

export const upsertPairNoteSchema = z.object({
  strategyId: z.string().min(1),
  symbol: z.string().min(1),
  notes: z.string(),
});

export const updateTradeProfitSchema = z.object({
  tradeId: z.string().min(1),
  profit: z.number().nullable(),
});

export const updateTestRunSchema = z.object({
  runId: z.string().min(1),
  versionId: z.string().optional(),
  testedAt: z.union([z.string(), z.date()]).optional(),
  symbol: z.string().min(1),
  timeframe: z.string().optional().nullable(),
  periodFrom: z.union([z.string(), z.date()]).optional().nullable(),
  periodTo: z.union([z.string(), z.date()]).optional().nullable(),
  initialDeposit: z.number(),
  currency: z.string().default('USD'),
  leverage: z.string().default('1:100'),
  finalBalance: z.number(),
  journal: z.string().optional().nullable(),
  rawLog: z.string().optional(),
  trades: z.array(tradeInputSchema).optional(),
});

export const deleteTestRunSchema = z.object({
  runId: z.string().min(1),
});

export const deleteVersionSchema = z.object({
  versionId: z.string().min(1, 'Version ID is required'),
});

