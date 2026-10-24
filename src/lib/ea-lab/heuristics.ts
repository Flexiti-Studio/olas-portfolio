/**
 * EA Lab Heuristic Thresholds and Rules
 * Editable configuration for strategy verdict and warning evaluation.
 * Label: Heuristics Configuration
 */

export interface EaHeuristicsConfig {
  minTradesForVerdict: number;
  promisingProfitFactorMin: number;
  promisingExpectancyMin: number; // in R
  smallSampleWarningThreshold: number;
}

export const EA_HEURISTICS: EaHeuristicsConfig = {
  // Under 30 trades => "Not enough data"
  minTradesForVerdict: 30,
  // Positive expectancy & profit factor above 1.3 => "Promising"
  promisingProfitFactorMin: 1.3,
  promisingExpectancyMin: 0.0,
  // Sample warning threshold
  smallSampleWarningThreshold: 30,
};

export type VerdictStatus = 'Promising' | 'Needs work' | 'Not enough data';

export interface StrategyVerdict {
  verdict: VerdictStatus;
  reasons: string[];
  warnings: string[];
}
