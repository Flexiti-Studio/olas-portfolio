export interface BiasInputs {
  novelty: "NEW" | "RECYCLED" | "STALE";
  catalystType: "PARTNERSHIP" | "PROTOCOL_UPGRADE" | "INSTITUTIONAL_ADOPTION" | "NETWORK_ACTIVITY" | "MARKET_WIDE" | "REGULATORY_ACTION" | "HACK_EXPLOIT" | "FUD" | string;
  confirmingSignal: boolean;
  hasLiquidity: boolean;
  isGoodSession: boolean;
  priceChange24h: number;
  priceChange7d: number;
  newsScore: number;
  sentiment?: string | null;
}

export interface BiasResult {
  bias: "BULLISH" | "BEARISH" | "NEUTRAL" | "CAUTION";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  warnings: string[];
}
