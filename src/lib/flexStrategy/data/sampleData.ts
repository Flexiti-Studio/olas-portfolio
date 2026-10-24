import { ICandle, Timeframe } from '../engine/types';

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

// Seeded pseudo-random number generator (Mulberry32) for deterministic, reproducible candles
function createPrng(seed: number) {
  let s = seed >>> 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Typical XAUUSD ATR (High - Low in USD) per timeframe
const TIMEFRAME_ATR_USD: Record<Timeframe, number> = {
  '1m': 1.2,
  '3m': 1.8,
  '5m': 2.6,
  '15m': 5.2,
  '30m': 8.0,
  '1h': 13.5,
  '4h': 26.0,
  '1d': 44.0,
};

/**
 * Generates authentic, realistic XAU/USD (Gold) candlestick data.
 * Simulates genuine Gold market microstructure:
 * - Real Gold price levels (~$2,650 - $2,705)
 * - Session cycles: Asian range accumulation -> London Judas liquidity sweep -> London bullish expansion
 *   -> NY morning volatility climax & liquidity grab -> Bearish market structure shift (displacement)
 *   -> Afternoon retracement & balanced range.
 * - Authentic Gold candlestick anatomy: impulse bars with small wicks, sharp liquidity rejection pinbars,
 *   indecision dojis at inflection points, and volume spikes on breakouts/sweeps.
 * - 100% deterministic via seeded PRNG so replays and tests are stable and reproducible.
 */
export function generateSampleXauusdCandles(count = 250, timeframe: Timeframe = '5m'): ICandle[] {
  const candles: ICandle[] = [];
  const intervalSeconds = TIMEFRAME_SECONDS[timeframe] || 300;
  const baseAtr = TIMEFRAME_ATR_USD[timeframe] || 2.6;

  // Recent realistic trading day baseline timestamp (00:00 UTC)
  const baseTime = 1728518400; // Thursday, Oct 10 2024 00:00:00 UTC

  // Seeded PRNG with fixed seed for Gold (0x474f4c44 = 'GOLD' in ASCII)
  const rng = createPrng(0x474f4c44);

  // Initial starting price for Gold
  let currentClose = 2664.5;

  // Market structure regimes across the dataset (percentage of total bars)
  // 1. Asian Accumulation (0.00 -> 0.18): tight chop range between $2661 and $2668
  // 2. London Judas Sweep (0.18 -> 0.25): sharp probe below Asian lows down to ~$2653 with heavy rejection wicks
  // 3. London Trend Expansion (0.25 -> 0.50): powerful bullish wave with higher highs & higher lows to ~$2688
  // 4. NY Open Climax Spike (0.50 -> 0.65): high-volatility push to ~$2704, printing shooting star reversal wick
  // 5. Bearish Displacement Shift (0.65 -> 0.85): institutional selloff slicing through supports to ~$2674
  // 6. Afternoon Range Consolidation (0.85 -> 1.00): corrective retest of $2682 and consolidation around $2678

  // Helper to generate normally distributed noise via Box-Muller transform
  const nextGaussian = () => {
    const u1 = Math.max(1e-6, rng());
    const u2 = rng();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  };

  // Track recent swing high and low for dynamic liquidity sweeps
  let recentHigh = currentClose + baseAtr * 1.5;
  let recentLow = currentClose - baseAtr * 1.5;

  for (let i = 0; i < count; i++) {
    const time = baseTime + i * intervalSeconds;
    const progress = i / Math.max(1, count - 1);

    // Determine market regime drift and volatility multiplier
    let regimeDrift = 0;
    let volFactor = 1.0;
    let isSweepCandidate = false;

    if (progress < 0.18) {
      // 1. Asian Consolidation: tight range around $2664
      const targetMid = 2664.5;
      regimeDrift = (targetMid - currentClose) * 0.22;
      volFactor = 0.5;
    } else if (progress < 0.25) {
      // 2. London Judas Sweep: probe down to ~$2653 to take out Asian lows
      regimeDrift = -baseAtr * 0.55;
      volFactor = 1.4;
      isSweepCandidate = true;
    } else if (progress < 0.5) {
      // 3. London Bullish Trend Expansion: higher highs & higher lows towards $2684
      const isPullback = rng() < 0.35;
      regimeDrift = isPullback ? -baseAtr * 0.25 : baseAtr * 0.48;
      volFactor = 1.15;
    } else if (progress < 0.65) {
      // 4. NY Open Surge & Liquidity Climax
      if (progress < 0.58) {
        regimeDrift = baseAtr * 0.62;
        volFactor = 1.5;
      } else {
        regimeDrift = -baseAtr * 0.25;
        volFactor = 1.8;
        isSweepCandidate = true;
      }
    } else if (progress < 0.84) {
      // 5. Bearish Market Structure Shift & Displacement towards $2673
      const isPullback = rng() < 0.32;
      regimeDrift = isPullback ? baseAtr * 0.25 : -baseAtr * 0.52;
      volFactor = 1.25;
    } else {
      // 6. NY Afternoon Balance around $2678
      const targetMid = 2677.5;
      regimeDrift = (targetMid - currentClose) * 0.22;
      volFactor = 0.65;
    }

    // Compute realistic candle change
    const barAtr = baseAtr * volFactor;
    const randomWalk = nextGaussian() * barAtr * 0.35;
    const priceChange = regimeDrift + randomWalk;

    const open = Number(currentClose.toFixed(2));
    const close = Number((open + priceChange).toFixed(2));
    const isBullish = close >= open;
    const bodySize = Math.abs(close - open);

    // Construct authentic XAU/USD wicks
    let upperWick = 0;
    let lowerWick = 0;

    if (isSweepCandidate && progress < 0.25) {
      // Hammer / Pinbar sweep at low: prominent lower rejection wick
      lowerWick = barAtr * (1.1 + rng() * 0.7);
      upperWick = barAtr * (0.08 + rng() * 0.15);
    } else if (isSweepCandidate && progress >= 0.58 && progress < 0.65) {
      // Shooting star sweep at peak: prominent upper rejection wick
      upperWick = barAtr * (1.2 + rng() * 0.7);
      lowerWick = barAtr * (0.08 + rng() * 0.15);
    } else if (bodySize > barAtr * 0.75) {
      // Momentum expansion candle: small wicks
      upperWick = barAtr * (0.06 + rng() * 0.18);
      lowerWick = barAtr * (0.06 + rng() * 0.18);
    } else {
      // Standard candle with natural asymmetry
      if (isBullish) {
        upperWick = barAtr * (0.12 + rng() * 0.38);
        lowerWick = barAtr * (0.08 + rng() * 0.28);
      } else {
        upperWick = barAtr * (0.08 + rng() * 0.28);
        lowerWick = barAtr * (0.12 + rng() * 0.38);
      }
    }

    // High and Low calculations
    const high = Number((Math.max(open, close) + upperWick).toFixed(2));
    const low = Number((Math.min(open, close) - lowerWick).toFixed(2));

    // Volume modeling: high volume on high volatility / sweeps / breakouts
    const baseVolume = 180 * Math.sqrt(intervalSeconds / 60);
    const volumeMultiplier = 0.6 + volFactor * 0.8 + (bodySize / barAtr) * 0.5 + (rng() * 0.4);
    const volume = Math.max(50, Math.floor(baseVolume * volumeMultiplier));

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });

    currentClose = close;

    // Update swing references
    if (high > recentHigh) recentHigh = high;
    if (low < recentLow) recentLow = low;
  }

  return candles;
}

export const SAMPLE_XAUUSD_5M: ICandle[] = generateSampleXauusdCandles(250);

