import { ICandle, Timeframe } from '../flexStrategy/engine/types';

export const TIMEFRAME_SECONDS_MAP: Record<Timeframe, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/**
 * Returns true if targetTimeframe is an exact positive integer multiple of baseTimeframe.
 */
export function isAllowedMultiple(baseTf: Timeframe, targetTf: Timeframe): boolean {
  const baseSec = TIMEFRAME_SECONDS_MAP[baseTf];
  const targetSec = TIMEFRAME_SECONDS_MAP[targetTf];
  if (!baseSec || !targetSec) return false;
  return targetSec >= baseSec && targetSec % baseSec === 0;
}

/**
 * Resamples an array of baseCandles into targetTf.
 * Aggregation rules:
 * - open = first candle's open in bucket
 * - high = max high of all candles in bucket
 * - low = min low of all candles in bucket
 * - close = last candle's close in bucket
 * - volume = sum of volume across all candles in bucket
 * - bucketed strictly by UTC time (Math.floor(time / targetSeconds) * targetSeconds)
 * - handles partial last bucket without look-ahead
 */
export function resample(baseCandles: ICandle[], targetTf: Timeframe): ICandle[] {
  if (!baseCandles || baseCandles.length === 0) return [];

  const targetSpanSec = TIMEFRAME_SECONDS_MAP[targetTf];
  if (!targetSpanSec) {
    throw new Error(`Unsupported target timeframe: ${targetTf}`);
  }

  // Detect whether timestamps are in seconds or milliseconds
  const isMs = baseCandles[0].time > 1e11;
  const unitFactor = isMs ? 1000 : 1;
  const bucketSpan = targetSpanSec * unitFactor;

  const buckets = new Map<number, ICandle[]>();

  for (let i = 0; i < baseCandles.length; i++) {
    const c = baseCandles[i];
    const bucketTime = Math.floor(c.time / bucketSpan) * bucketSpan;
    let list = buckets.get(bucketTime);
    if (!list) {
      list = [];
      buckets.set(bucketTime, list);
    }
    list.push(c);
  }

  const result: ICandle[] = [];
  const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (const bTime of sortedBucketTimes) {
    const bars = buckets.get(bTime)!;
    if (bars.length === 0) continue;

    const open = bars[0].open;
    const close = bars[bars.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;

    for (let j = 0; j < bars.length; j++) {
      const b = bars[j];
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      if (b.volume != null) volume += b.volume;
    }

    result.push({
      time: bTime,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return result;
}

// Backward compatibility alias for existing code
export const resampleCandles = resample;
