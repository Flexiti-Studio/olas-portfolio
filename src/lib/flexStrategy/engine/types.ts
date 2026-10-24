export interface ICandle {
  time: number; // Unix timestamp in seconds or milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface ParamSchemaItem {
  key: string;
  type: 'number' | 'boolean' | 'select' | 'string';
  default: any;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
}

export interface StrategyContract {
  name: string;
  params: ParamSchemaItem[];
  code: string;
}

export interface TradeOrderSignal {
  action: 'buy' | 'sell' | 'close' | null;
  sl?: number | null;
  tp?: number | null;
}

export interface ActivePosition {
  side: 'buy' | 'sell';
  entryPrice: number;
  entryTime: number;
  sl?: number | null;
  tp?: number | null;
  barIndex: number;
  // Tracking excursions
  maxRunUp?: number;
  maxDrawdown?: number;
}

export interface CompletedTrade {
  id: string;
  side: 'buy' | 'sell';
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  sl?: number | null;
  tp?: number | null;
  pnl: number;
  pnlPercent: number;
  reason: 'SL' | 'TP' | 'SIGNAL_CLOSE' | 'REVERSE' | 'END_OF_DATA';
  // TradingView trade metrics
  entryBarIndex?: number;
  exitBarIndex?: number;
  barsInTrade?: number;
  runUp?: number; // Max favorable excursion ($)
  runUpPercent?: number;
  drawdown?: number; // Max adverse excursion ($)
  drawdownPercent?: number;
  cumulativeProfit?: number;
  cumulativeProfitPercent?: number;
  contracts?: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
  drawdown: number;
}

export interface TradeSubsetStats {
  netProfit: number;
  netProfitPercent: number;
  grossProfit: number;
  grossLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  evenTrades: number;
  winRate: number; // percentage
  profitFactor: number;
  avgTrade: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  largestWin: number;
  largestLoss: number;
  avgBarsInTrade: number;
  avgBarsInWin: number;
  avgBarsInLoss: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxRunUp: number;
  maxRunUpPercent: number;
}

export interface SimulationStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number; // percentage, e.g. 60.5
  profitFactor: number;
  netProfit: number;
  netProfitPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  // TradingView Performance Summary
  all?: TradeSubsetStats;
  long?: TradeSubsetStats;
  short?: TradeSubsetStats;
  buyAndHoldReturn?: number;
  buyAndHoldReturnPercent?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
}

export interface StrategyContext {
  bar: ICandle;
  history: ICandle[];
  index: number;
  params: Record<string, any>;
  position: ActivePosition | null;
  indicators: {
    sma: (period: number, offset?: number) => number | null;
    ema: (period: number, offset?: number) => number | null;
    atr: (period: number, offset?: number) => number | null;
    rsi: (period: number, offset?: number) => number | null;
    highest: (period: number, offset?: number) => number | null;
    lowest: (period: number, offset?: number) => number | null;
    vwap: (period?: number) => number | null;
  };
}

export interface SimulationResult {
  trades: CompletedTrade[];
  equityCurve: EquityPoint[];
  stats: SimulationStats;
  runningPosition?: ActivePosition | null;
  error?: string;
}

