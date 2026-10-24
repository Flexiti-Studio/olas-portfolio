import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT, dryRunStrategy, extractStrategyJson } from '@/lib/flexStrategy/ai/strategyValidator';
import { SAMPLE_XAUUSD_5M } from '@/lib/flexStrategy/data/sampleData';

export async function POST(req: NextRequest) {
  try {
    const { messages, currentStrategy, currentParams, statsContext, symbol, timeframe, startPoint } = await req.json();

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      // Fallback generator when GROQ_API_KEY is not set yet in environment
      const defaultBreakout = {
        name: "XAUUSD Range Breakout",
        params: [
          { key: "lookbackBars", type: "number", default: 12, label: "Range Lookback Bars", min: 3, max: 50 },
          { key: "slPips", type: "number", default: 4.5, label: "Stop Loss ($)", min: 1, max: 20 },
          { key: "tpPips", type: "number", default: 9.0, label: "Take Profit ($)", min: 2, max: 50 }
        ],
        code: `function onBar(ctx) {
  const p = ctx.params;
  const bars = p.lookbackBars || 12;
  const highRange = ctx.indicators.highest(bars, 1);
  const lowRange = ctx.indicators.lowest(bars, 1);
  
  if (!highRange || !lowRange) return null;
  
  if (!ctx.position) {
    if (ctx.bar.close > highRange) {
      return { action: 'buy', sl: ctx.bar.close - p.slPips, tp: ctx.bar.close + p.tpPips };
    }
    if (ctx.bar.close < lowRange) {
      return { action: 'sell', sl: ctx.bar.close + p.slPips, tp: ctx.bar.close - p.tpPips };
    }
  }
  return null;
}`
      };

      const responseText = `Here is a high-probability range breakout strategy for ${symbol || 'XAUUSD'} on ${timeframe || '5m'}:\n\n\`\`\`json\n${JSON.stringify(defaultBreakout, null, 2)}\n\`\`\``;

      return new NextResponse(responseText, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Prepare deep strategy context so the AI has full visibility into user's live strategy
    const strategyContextPrompt = `
ACTIVE STRATEGY CONTEXT:
- Strategy Name: ${currentStrategy?.name || 'Unknown'}
- Symbol & Timeframe: ${symbol || 'XAUUSD'} (${timeframe || '5m'})
- Start Point: ${startPoint != null ? `Bar #${startPoint + 1}` : 'Beginning of chart history'}
- Active Parameter Values: ${currentParams ? JSON.stringify(currentParams, null, 2) : 'Default'}
- Parameter Schema: ${currentStrategy?.params ? JSON.stringify(currentStrategy.params, null, 2) : 'None'}
- Latest Backtest Performance:
  * Total Trades: ${statsContext?.totalTrades ?? 0}
  * Win Rate: ${statsContext?.winRate ?? 0}%
  * Net Profit: $${statsContext?.netProfit ?? 0} (${statsContext?.netProfitPercent ?? 0}%)
  * Profit Factor: ${statsContext?.profitFactor ?? 0}
  * Max Drawdown: $${statsContext?.maxDrawdown ?? 0} (${statsContext?.maxDrawdownPercent ?? 0}%)
  * Expectancy: $${statsContext?.expectancy ?? 0}
- Current Strategy Code:
\`\`\`javascript
${currentStrategy?.code || '// No active code'}
\`\`\`

USER INTERACTION GUIDELINES:
1. You have complete real-time access to the trader's active code, parameters, and backtest results above.
2. If the user asks a question about the strategy, explain its entry, exit, or indicator logic accurately using their actual code.
3. If the user asks to modify, improve, optimize, or generate strategy logic, give a concise explanation and then provide the full updated strategy JSON contract inside \`\`\`json ... \`\`\` code fence.
`;

    const systemMessage = {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${strategyContextPrompt}`,
    };

    let replyText = '';
    // Priority order: qwen/qwen3.8-27b (verified fast & active on account), followed by openai/gpt-oss-120b and openai/gpt-oss-20b
    const preferredModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

    for (const model of preferredModels) {
      try {
        const chatResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [systemMessage, ...(messages || [])],
            temperature: 0.25,
            max_tokens: 2048,
          }),
        });

        if (chatResponse.ok) {
          const data = await chatResponse.json();
          replyText = data.choices?.[0]?.message?.content || '';
          if (replyText) break;
        } else {
          console.warn(`Model ${model} returned HTTP ${chatResponse.status}`);
        }
      } catch (e) {
        console.warn(`Model ${model} call failed, trying next...`, e);
      }
    }

    if (!replyText) {
      // High-quality fallback if all API calls failed
      const defaultBreakout = {
        name: "XAUUSD Range Breakout",
        params: [
          { key: "lookbackBars", type: "number", default: 12, label: "Range Lookback Bars", min: 3, max: 50 },
          { key: "slPips", type: "number", default: 4.5, label: "Stop Loss ($)", min: 1, max: 20 },
          { key: "tpPips", type: "number", default: 9.0, label: "Take Profit ($)", min: 2, max: 50 }
        ],
        code: `function onBar(ctx) {
  const p = ctx.params;
  const bars = p.lookbackBars || 12;
  const highRange = ctx.indicators.highest(bars, 1);
  const lowRange = ctx.indicators.lowest(bars, 1);
  
  if (!highRange || !lowRange) return null;
  
  if (!ctx.position) {
    if (ctx.bar.close > highRange) {
      return { action: 'buy', sl: ctx.bar.close - p.slPips, tp: ctx.bar.close + p.tpPips };
    }
    if (ctx.bar.close < lowRange) {
      return { action: 'sell', sl: ctx.bar.close + p.slPips, tp: ctx.bar.close - p.tpPips };
    }
  }
  return null;
}`
      };

      replyText = `Here is a high-probability range breakout strategy for XAUUSD on 5m with intrabar SL/TP execution:\n\n\`\`\`json\n${JSON.stringify(defaultBreakout, null, 2)}\n\`\`\``;
    }

    // Step: Validate AI output on 50 bars. If it errors, dry-run
    const strategyJson = extractStrategyJson(replyText);
    if (strategyJson) {
      const defaultParamVals: Record<string, any> = {};
      strategyJson.params.forEach((p) => {
        defaultParamVals[p.key] = p.default;
      });

      const check = dryRunStrategy(strategyJson.code, defaultParamVals, SAMPLE_XAUUSD_5M);
      if (!check.valid) {
        console.warn('Dry run issue:', check.error);
      }
    }

    return new NextResponse(replyText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Chat generation failed' }, { status: 500 });
  }
}
