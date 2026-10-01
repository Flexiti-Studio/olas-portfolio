import { computeBias } from './computeBias';
import { BiasInputs } from './types';

describe('computeBias', () => {
  const defaultInputs: BiasInputs = {
    novelty: "NEW",
    catalystType: "PARTNERSHIP",
    confirmingSignal: true,
    hasLiquidity: true,
    isGoodSession: true,
    priceChange24h: 5,
    priceChange7d: 10,
    newsScore: 80,
  };

  it('returns BULLISH HIGH confidence for all positive signals', () => {
    const result = computeBias(defaultInputs);
    expect(result.bias).toBe('BULLISH');
    expect(result.confidence).toBe('HIGH');
    expect(result.warnings).toHaveLength(0);
    expect(result.reasons).toContain("Fresh high-impact catalyst confirmed by volume");
  });

  it('forces CAUTION when liquidity is thin, even with good news', () => {
    const inputs: BiasInputs = { ...defaultInputs, hasLiquidity: false };
    const result = computeBias(inputs);
    expect(result.bias).toBe('CAUTION');
    expect(result.confidence).toBe('LOW');
    expect(result.warnings).toContain("Liquidity below safe threshold — treat any signal here with extra caution");
  });

  it('neutral contribution for RECYCLED news with volume', () => {
    const inputs: BiasInputs = { 
      ...defaultInputs, 
      novelty: "RECYCLED", 
      priceChange24h: 0, 
      priceChange7d: 0 
    };
    const result = computeBias(inputs);
    // Tally = 0 (Recycled) + 1 (Good session) + 0 (No price agreement) = 1 (NEUTRAL)
    expect(result.bias).toBe('NEUTRAL');
    expect(result.reasons).toContain("No new catalyst — this is repeated/old news");
  });

  it('returns BEARISH for fresh negative catalyst confirmed by volume and price drop', () => {
    const inputs: BiasInputs = {
      ...defaultInputs,
      catalystType: "HACK_EXPLOIT",
      priceChange24h: -5,
      priceChange7d: -10,
    };
    const result = computeBias(inputs);
    expect(result.bias).toBe('BEARISH');
    expect(result.reasons).toContain("Fresh negative catalyst confirmed by volume");
    expect(result.reasons).toContain("Price action agrees with the bearish news read");
  });

  it('warns about bad session timing but keeps bullish tally', () => {
    const inputs: BiasInputs = { ...defaultInputs, isGoodSession: false };
    const result = computeBias(inputs);
    expect(result.bias).toBe('BULLISH');
    expect(result.confidence).toBe('MEDIUM'); // downgraded due to warning
    expect(result.warnings).toContain("Outside typical active hours for this coin — moves here can be less reliable");
  });

  it('warns when price does not confirm positive news', () => {
    const inputs: BiasInputs = { 
      ...defaultInputs, 
      priceChange24h: -2, 
      priceChange7d: -1 
    };
    const result = computeBias(inputs);
    expect(result.bias).toBe('BULLISH');
    expect(result.warnings).toContain("Price hasn't confirmed the positive news yet — mixed signal");
  });

  it('treats REGULATORY with NEGATIVE sentiment as bearish', () => {
    const inputs: BiasInputs = {
      ...defaultInputs,
      catalystType: "REGULATORY",
      sentiment: "NEGATIVE",
      priceChange24h: -5,
      priceChange7d: -10,
    };
    const result = computeBias(inputs);
    expect(result.bias).toBe('BEARISH');
    expect(result.reasons).toContain("Fresh negative catalyst confirmed by volume");
  });

  it('treats REGULATORY with AMBIGUOUS sentiment neutrally', () => {
    const inputs: BiasInputs = {
      ...defaultInputs,
      catalystType: "REGULATORY",
      sentiment: "AMBIGUOUS",
      priceChange24h: 1,
      priceChange7d: 1,
    };
    const result = computeBias(inputs);
    expect(result.bias).toBe('NEUTRAL'); // Tally won't be modified by Block A since it's neither High nor Negative impact
  });
});
