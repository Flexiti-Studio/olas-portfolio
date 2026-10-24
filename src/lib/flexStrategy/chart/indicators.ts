export type IndicatorType =
  | 'sma'
  | 'ema'
  | 'wma'
  | 'rsi'
  | 'atr'
  | 'vwap'
  | 'highest'
  | 'lowest'
  | 'boll'
  | 'macd'
  | 'supertrend'
  | 'vol'
  | 'kdj';

export interface ChartIndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  period: number;
  color: string;
  lineWidth: number;
  overlay: boolean; // true = drawn on main price chart, false = sub-panel (like RSI, ATR, MACD)
  visible: boolean;
  source?: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3';
  calcParams?: number[];
  multiplier?: number; // for SuperTrend
  stdDev?: number; // for Bollinger Bands
}

export const DEFAULT_INDICATOR_PALETTES = [
  '#f59e0b', // Amber / Gold (TradingView default for EMA/MA)
  '#2962ff', // Royal Blue
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f97316', // Orange
  '#e11d48', // Crimson
  '#14b8a6', // Teal
];

/**
 * Format authentic TradingView indicator title
 * e.g. "EMA 20 close", "RSI 14", "BOLL 20 2"
 */
export function formatIndicatorTitle(config: ChartIndicatorConfig): string {
  const typeUpper = config.type.toUpperCase();
  const src = config.source && config.source !== 'close' ? ` ${config.source}` : '';

  switch (config.type) {
    case 'ema':
    case 'sma':
    case 'wma':
      return `${typeUpper} ${config.period}${src}`;
    case 'rsi':
      return `RSI ${config.period}${src}`;
    case 'atr':
      return `ATR ${config.period}`;
    case 'vwap':
      return 'VWAP';
    case 'boll':
      return `BB ${config.period} ${config.stdDev ?? 2}`;
    case 'supertrend':
      return `SuperTrend ${config.period} ${config.multiplier ?? 3}`;
    case 'macd':
      return 'MACD 12 26 9';
    case 'highest':
      return `High Channel ${config.period}`;
    case 'lowest':
      return `Low Channel ${config.period}`;
    case 'vol':
      return 'Volume';
    default:
      return `${config.name || typeUpper}`;
  }
}

/**
 * Extract price value based on configured source
 */
export function getCandleSourcePrice(
  candle: { open: number; high: number; low: number; close: number },
  source: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' = 'close'
): number {
  switch (source) {
    case 'open':
      return candle.open;
    case 'high':
      return candle.high;
    case 'low':
      return candle.low;
    case 'hl2':
      return (candle.high + candle.low) / 2;
    case 'hlc3':
      return (candle.high + candle.low + candle.close) / 3;
    case 'close':
    default:
      return candle.close;
  }
}

/**
 * Compute the live indicator value for legend display at candle index
 */
export function computeLiveIndicatorValue(
  config: ChartIndicatorConfig,
  candles: Array<{ open: number; high: number; low: number; close: number; volume?: number }>,
  targetIndex?: number
): string {
  if (!candles || candles.length === 0) return '—';
  const idx = targetIndex != null ? Math.min(targetIndex, candles.length - 1) : candles.length - 1;
  if (idx < 0) return '—';

  const period = config.period || 14;
  const source = config.source || 'close';

  switch (config.type) {
    case 'sma': {
      if (idx < period - 1) return '—';
      let sum = 0;
      for (let i = idx - period + 1; i <= idx; i++) {
        sum += getCandleSourcePrice(candles[i], source);
      }
      return (sum / period).toFixed(2);
    }
    case 'ema': {
      if (idx < period - 1) return '—';
      const k = 2 / (period + 1);
      let ema = 0;
      for (let i = 0; i < period; i++) {
        ema += getCandleSourcePrice(candles[i], source);
      }
      ema /= period;
      for (let i = period; i <= idx; i++) {
        ema = getCandleSourcePrice(candles[i], source) * k + ema * (1 - k);
      }
      return ema.toFixed(2);
    }
    case 'wma': {
      if (idx < period - 1) return '—';
      let sum = 0;
      let weightSum = 0;
      for (let i = 0; i < period; i++) {
        const weight = i + 1;
        sum += getCandleSourcePrice(candles[idx - period + 1 + i], source) * weight;
        weightSum += weight;
      }
      return (sum / weightSum).toFixed(2);
    }
    case 'rsi': {
      if (idx < period) return '—';
      let gains = 0;
      let losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      let avgG = gains / period;
      let avgL = losses / period;
      for (let i = period + 1; i <= idx; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        const g = diff >= 0 ? diff : 0;
        const l = diff < 0 ? Math.abs(diff) : 0;
        avgG = (avgG * (period - 1) + g) / period;
        avgL = (avgL * (period - 1) + l) / period;
      }
      if (avgL === 0) return '100.00';
      const rs = avgG / avgL;
      return (100 - 100 / (1 + rs)).toFixed(2);
    }
    case 'atr': {
      if (idx < period) return '—';
      let trSum = 0;
      const trs: number[] = [];
      for (let i = 1; i <= idx; i++) {
        const h = candles[i].high;
        const l = candles[i].low;
        const pc = candles[i - 1].close;
        trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
      }
      if (trs.length < period) return '—';
      for (let i = 0; i < period; i++) trSum += trs[i];
      let atr = trSum / period;
      for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
      }
      return atr.toFixed(2);
    }
    case 'vwap': {
      let cumVol = 0;
      let cumTypVol = 0;
      for (let i = 0; i <= idx; i++) {
        const typ = (candles[i].high + candles[i].low + candles[i].close) / 3;
        const vol = candles[i].volume ?? 100;
        cumVol += vol;
        cumTypVol += typ * vol;
      }
      if (cumVol === 0) return '—';
      return (cumTypVol / cumVol).toFixed(2);
    }
    case 'highest': {
      if (idx < period - 1) return '—';
      let max = -Infinity;
      for (let i = idx - period + 1; i <= idx; i++) {
        if (candles[i].high > max) max = candles[i].high;
      }
      return max.toFixed(2);
    }
    case 'lowest': {
      if (idx < period - 1) return '—';
      let min = Infinity;
      for (let i = idx - period + 1; i <= idx; i++) {
        if (candles[i].low < min) min = candles[i].low;
      }
      return min.toFixed(2);
    }
    case 'boll': {
      if (idx < period - 1) return '—';
      let sum = 0;
      for (let i = idx - period + 1; i <= idx; i++) {
        sum += candles[i].close;
      }
      const mid = sum / period;
      let variance = 0;
      for (let i = idx - period + 1; i <= idx; i++) {
        variance += Math.pow(candles[i].close - mid, 2);
      }
      const sd = Math.sqrt(variance / period);
      const mult = config.stdDev ?? 2;
      return `${(mid + mult * sd).toFixed(2)} | ${mid.toFixed(2)} | ${(mid - mult * sd).toFixed(2)}`;
    }
    case 'vol': {
      const vol = candles[idx]?.volume;
      if (vol === undefined || vol === null) return '—';
      return Math.round(vol).toLocaleString();
    }
    default:
      return '—';
  }
}
