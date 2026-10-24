import { ICandle } from './types';

/**
 * Simple Moving Average (SMA)
 */
export function calculateSma(
  candles: ICandle[],
  period: number,
  offset = 0
): number | null {
  const endIndex = candles.length - 1 - offset;
  const startIndex = endIndex - period + 1;
  if (startIndex < 0 || endIndex < 0 || period <= 0) return null;

  let sum = 0;
  for (let i = startIndex; i <= endIndex; i++) {
    sum += candles[i].close;
  }
  return Number((sum / period).toFixed(4));
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEma(
  candles: ICandle[],
  period: number,
  offset = 0
): number | null {
  const targetIndex = candles.length - 1 - offset;
  if (targetIndex < period - 1 || period <= 0) return null;

  const k = 2 / (period + 1);
  // Initial SMA as seed
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += candles[i].close;
  }
  ema /= period;

  for (let i = period; i <= targetIndex; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return Number(ema.toFixed(4));
}

/**
 * Average True Range (ATR)
 */
export function calculateAtr(
  candles: ICandle[],
  period: number,
  offset = 0
): number | null {
  const targetIndex = candles.length - 1 - offset;
  if (targetIndex < period || period <= 0) return null;

  const trs: number[] = [];
  for (let i = 1; i <= targetIndex; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }

  if (trs.length < period) return null;

  // Wilder's smoothed ATR
  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += trs[i];
  }
  atr /= period;

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return Number(atr.toFixed(4));
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRsi(
  candles: ICandle[],
  period = 14,
  offset = 0
): number | null {
  const targetIndex = candles.length - 1 - offset;
  if (targetIndex < period || period <= 0) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i <= targetIndex; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const currentGain = change >= 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(2));
}

/**
 * Highest High over given period
 */
export function calculateHighest(
  candles: ICandle[],
  period: number,
  offset = 0
): number | null {
  const endIndex = candles.length - 1 - offset;
  const startIndex = endIndex - period + 1;
  if (startIndex < 0 || endIndex < 0 || period <= 0) return null;

  let max = -Infinity;
  for (let i = startIndex; i <= endIndex; i++) {
    if (candles[i].high > max) max = candles[i].high;
  }
  return Number(max.toFixed(4));
}

/**
 * Lowest Low over given period
 */
export function calculateLowest(
  candles: ICandle[],
  period: number,
  offset = 0
): number | null {
  const endIndex = candles.length - 1 - offset;
  const startIndex = endIndex - period + 1;
  if (startIndex < 0 || endIndex < 0 || period <= 0) return null;

  let min = Infinity;
  for (let i = startIndex; i <= endIndex; i++) {
    if (candles[i].low < min) min = candles[i].low;
  }
  return Number(min.toFixed(4));
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVwap(
  candles: ICandle[],
  period?: number
): number | null {
  if (candles.length === 0) return null;
  const slice = period && period > 0 ? candles.slice(-period) : candles;

  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  for (const bar of slice) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    const vol = bar.volume ?? 1;
    cumulativeTypicalVolume += typicalPrice * vol;
    cumulativeVolume += vol;
  }

  if (cumulativeVolume === 0) return null;
  return Number((cumulativeTypicalVolume / cumulativeVolume).toFixed(4));
}
