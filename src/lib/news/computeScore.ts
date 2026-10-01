import { CatalystType, Novelty } from '@prisma/client';

export const SCORING_WEIGHTS = {
  NOVELTY: {
    NEW: 40,
    RECYCLED: 10,
  },
  VOLUME_SIGNAL: {
    TRUE: 35,
    FALSE: 10,
  },
  CATALYST: {
    HIGH_IMPACT: 25, // INSTITUTIONAL_ADOPTION or PROTOCOL_UPGRADE
    NEGATIVE_IMPACT: 20, // HACK_EXPLOIT
    DEFAULT: 10,
  }
};

interface ScoreInputs {
  novelty: Novelty;
  confirmingSignal: boolean;
  catalystType: CatalystType;
  hasLiquidity: boolean;
  isGoodSession: boolean;
}

export function computeScore({ novelty, confirmingSignal, catalystType, hasLiquidity, isGoodSession }: ScoreInputs): number {
  let score = 0;

  // Novelty weight
  score += novelty === Novelty.NEW ? SCORING_WEIGHTS.NOVELTY.NEW : SCORING_WEIGHTS.NOVELTY.RECYCLED;

  // Confirming signal weight
  score += confirmingSignal ? SCORING_WEIGHTS.VOLUME_SIGNAL.TRUE : SCORING_WEIGHTS.VOLUME_SIGNAL.FALSE;

  // Catalyst weight
  if (catalystType === "INSTITUTIONAL_ADOPTION" || catalystType === "PROTOCOL_UPGRADE") {
    score += SCORING_WEIGHTS.CATALYST.HIGH_IMPACT;
  } else if (catalystType === "HACK_EXPLOIT") {
    score += SCORING_WEIGHTS.CATALYST.NEGATIVE_IMPACT; // Negative catalysts are highly important, so they still get a high positive score
  } else {
    score += SCORING_WEIGHTS.CATALYST.DEFAULT;
  }

  // Session Quality bonus
  if (isGoodSession) {
    score += 5; // Slight bonus for a good active trading session
  }

  // Cap at 100 just in case
  score = Math.min(score, 100);

  // Hard cap for low liquidity
  if (!hasLiquidity) {
    score = Math.min(score, 30);
  }

  return score;
}
