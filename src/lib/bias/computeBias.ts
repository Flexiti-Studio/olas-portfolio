import { BiasInputs, BiasResult } from './types';

export function computeBias(inputs: BiasInputs): BiasResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  
  let tally = 0;

  // Block A - News quality
  const isHighImpact = ["INSTITUTIONAL_ADOPTION", "PROTOCOL_UPGRADE", "PARTNERSHIP", "MARKET_WIDE"].includes(inputs.catalystType) || (inputs.catalystType === "REGULATORY" && inputs.sentiment === "POSITIVE");
  const isNegativeImpact = ["HACK_EXPLOIT", "FUD"].includes(inputs.catalystType) || (inputs.catalystType === "REGULATORY" && inputs.sentiment === "NEGATIVE");
  
  // REGULATORY is directionally ambiguous by default, so we rely on the sentiment tag provided by the LLM
  // If it's AMBIGUOUS or missing, it will not fall into high/negative impact blocks automatically.
  
  if (inputs.novelty === "NEW") {
    if (inputs.confirmingSignal && isHighImpact) {
      tally += 2;
      reasons.push("Fresh high-impact catalyst confirmed by volume");
    } else if (inputs.confirmingSignal && isNegativeImpact) {
      tally -= 2;
      reasons.push("Fresh negative catalyst confirmed by volume");
    } else if (!inputs.confirmingSignal) {
      if (isHighImpact) {
        tally += 1;
        warnings.push("News is fresh but volume hasn't confirmed interest yet");
      } else if (isNegativeImpact) {
        tally -= 1;
        warnings.push("News is fresh but volume hasn't confirmed panic yet");
      }
    } else {
      // New, confirming, but normal catalyst
      tally += 1;
      reasons.push("Fresh catalyst with volume confirmation");
    }
  } else {
    // RECYCLED or STALE
    reasons.push("No new catalyst — this is repeated/old news");
  }

  // Block C - Session timing (Evaluating before block B which overrides)
  if (inputs.isGoodSession) {
    if (tally > 0) {
      tally += 1;
      reasons.push("Currently within this coin's historically active trading hours");
    } else if (tally < 0) {
      tally -= 1;
      reasons.push("Currently within this coin's historically active trading hours");
    }
  } else {
    warnings.push("Outside typical active hours for this coin — moves here can be less reliable");
  }

  // Block D - Price momentum agreement/disagreement
  if (tally > 0) {
    if (inputs.priceChange24h > 0 && inputs.priceChange7d > 0) {
      tally += 1;
      reasons.push("Price action agrees with the news read");
    } else if (inputs.priceChange24h < 0 || inputs.priceChange7d < 0) {
      warnings.push("Price hasn't confirmed the positive news yet — mixed signal");
    }
  } else if (tally < 0) {
    if (inputs.priceChange24h < 0 && inputs.priceChange7d < 0) {
      tally -= 1;
      reasons.push("Price action agrees with the bearish news read");
    } else if (inputs.priceChange24h > 0 || inputs.priceChange7d > 0) {
      warnings.push("Price hasn't confirmed the negative news yet — mixed signal");
    }
  }

  // Final bias derivation
  let bias: BiasResult['bias'] = 'NEUTRAL';
  if (tally >= 2) bias = 'BULLISH';
  else if (tally <= -2) bias = 'BEARISH';

  // Confidence derivation
  let confidence: BiasResult['confidence'] = 'LOW';
  
  if (Math.abs(tally) >= 3 && warnings.length === 0) {
    confidence = 'HIGH';
  } else if (Math.abs(tally) >= 2 && warnings.length > 0) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  // Block B - Liquidity gate override
  if (!inputs.hasLiquidity) {
    bias = 'CAUTION';
    confidence = 'LOW';
    warnings.push("Liquidity below safe threshold — treat any signal here with extra caution");
  }

  return { bias, confidence, reasons, warnings };
}
