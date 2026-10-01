import { NewsEvent } from '@prisma/client';

export type BiasResult = {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reasons: string[];
};

export function computeBias(
  latestNews: NewsEvent | null,
  hasLiquidity: boolean,
  isGoodSession: boolean,
  price7dChange: number
): BiasResult {
  const reasons: string[] = [];
  
  if (!latestNews) {
    reasons.push("No recent news events found to establish a strong thesis.");
    return { bias: 'NEUTRAL', reasons };
  }

  let bullishFactors = 0;
  let bearishFactors = 0;

  // News Catalyst check
  const strongCatalysts = ['INSTITUTIONAL_ADOPTION', 'PROTOCOL_UPGRADE', 'PARTNERSHIP', 'MARKET_WIDE'];
  const negativeCatalysts = ['REGULATORY_ACTION', 'HACK_EXPLOIT', 'FUD'];
  
  if (strongCatalysts.includes(latestNews.catalystType)) {
    bullishFactors += 2;
    reasons.push(`Strong positive catalyst detected (${latestNews.catalystType}).`);
  } else if (negativeCatalysts.includes(latestNews.catalystType)) {
    bearishFactors += 2;
    reasons.push(`Negative catalyst detected (${latestNews.catalystType}).`);
  }

  // Novelty check
  if (latestNews.novelty === 'NEW') {
    bullishFactors += 1;
    reasons.push("News is fresh and novel, increasing potential market impact.");
  } else if (latestNews.novelty === 'RECYCLED' || latestNews.novelty === 'STALE') {
    bearishFactors += 1;
    reasons.push("News is recycled or stale, limiting upside momentum.");
  }

  // Volume Confirmation
  if (latestNews.confirmingSignal) {
    bullishFactors += 1;
    reasons.push("Strong relative volume confirms real market interest.");
  } else {
    bearishFactors += 1;
    reasons.push("Lack of volume confirmation suggests weak conviction.");
  }

  // Session Quality
  if (isGoodSession) {
    bullishFactors += 1;
    reasons.push("Trading session indicates high active participation.");
  }

  // Price Momentum Check
  if (price7dChange > 5) {
    bullishFactors += 1;
    reasons.push("7-day price momentum is strongly positive.");
  } else if (price7dChange < -5) {
    bearishFactors += 2;
    reasons.push("7-day price trend is heavily negative, indicating structural weakness.");
  }

  // Liquidity is a hard constraint
  if (!hasLiquidity) {
    reasons.push("Thin liquidity detected — treat with extreme caution. Unable to establish a clean bullish read.");
    return { bias: 'NEUTRAL', reasons };
  }

  // Synthesize Result
  if (bullishFactors >= 4 && bearishFactors <= 1) {
    return { bias: 'BULLISH', reasons };
  } else if (bearishFactors >= 3) {
    return { bias: 'BEARISH', reasons };
  } else {
    if (bullishFactors > 0 && bearishFactors > 0) {
      reasons.push("Mixed signals prevent a clear directional bias.");
    } else {
      reasons.push("Current data lacks strong directional momentum.");
    }
    return { bias: 'NEUTRAL', reasons };
  }
}
