import { StrategyContract, SimulationStats, CompletedTrade, ICandle } from '../engine/types';
import { compileStrategyCode, runSimulation } from '../engine/simulationEngine';

export const SYSTEM_PROMPT = `
You are flexStrategy's senior strategy engineer.
Traders describe a trading idea in chat, and you translate it into a valid trading strategy JSON contract.

CRITICAL INSTRUCTIONS:
1. Always respond with a concise 1-2 sentence explanation followed by the complete strategy JSON contract wrapped in \`\`\`json ... \`\`\` markdown fences.
2. The JSON contract MUST follow this exact schema:
{
  "name": "Strategy Name",
  "params": [
    { "key": "paramKey", "type": "number" | "boolean" | "select", "default": value, "label": "Human Label", "min": optional, "max": optional, "step": optional }
  ],
  "code": "function onBar(ctx) {\\n  // ctx.bar has open, high, low, close, volume, time\\n  // ctx.params has the strategy inputs\\n  // ctx.position is null or { side: 'buy'|'sell', entryPrice, entryTime, sl, tp }\\n  // ctx.indicators has sma(period), ema(period), atr(period), rsi(period), highest(period), lowest(period), vwap()\\n  // return { action: 'buy' | 'sell' | 'close' | null, sl: number | null, tp: number | null }\\n}"
}

3. Code execution rules:
- Fills happen on next bar open.
- If in an opposite position, returning { action: 'buy' } or { action: 'sell' } automatically reverses the position.
- If returning { action: 'close' }, it exits the active position.
- Always provide sensible numeric stop loss (sl) and take profit (tp) price levels when opening trades.
- For time/range breakouts, use the bar time or candle index to track the range.
- Do NOT use \`window\`, \`document\`, \`fetch\`, or external libraries. Only pure JavaScript and \`ctx\`.
`;

/**
 * Validates generated code by executing a dry-run against 50 bars.
 */
export function dryRunStrategy(
  code: string,
  params: Record<string, any>,
  candles: ICandle[]
): { valid: boolean; error?: string } {
  try {
    const fn = compileStrategyCode(code);
    const testSlice = candles.slice(0, Math.min(candles.length, 50));
    const result = runSimulation(testSlice, fn, params);
    if (result.error) {
      return { valid: false, error: result.error };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err?.message || String(err) };
  }
}

/**
 * Parses strategy JSON from model output text.
 */
export function extractStrategyJson(text: string): StrategyContract | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*"name"[\s\S]*"params"[\s\S]*"code"[\s\S]*\})/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.name && Array.isArray(parsed.params) && typeof parsed.code === 'string') {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse strategy JSON from LLM output:', e);
  }
  return null;
}
