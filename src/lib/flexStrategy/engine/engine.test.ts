import { runSimulation, compileStrategyCode } from './simulationEngine';
import { calculateSimulationStats } from './stats';
import { ICandle, StrategyContext } from './types';
import { calculateSma, calculateRsi } from './indicators';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

console.log('--- Running flexStrategy engine.test.ts ---');

// 1. Fixed small test dataset: 6 bars
const testBars: ICandle[] = [
  { time: 1000, open: 100, high: 105, low: 98, close: 102, volume: 100 },
  { time: 1060, open: 102, high: 108, low: 101, close: 107, volume: 150 },
  { time: 1120, open: 107, high: 112, low: 106, close: 110, volume: 200 },
  { time: 1180, open: 110, high: 111, low: 95, close: 96, volume: 300 }, // Big drop
  { time: 1240, open: 96, high: 99, low: 92, close: 94, volume: 120 },
  { time: 1300, open: 94, high: 101, low: 93, close: 100, volume: 180 },
];

// Test Indicators
{
  console.log('Testing SMA...');
  const sma3 = calculateSma(testBars.slice(0, 3), 3);
  // (102 + 107 + 110) / 3 = 106.3333
  assert(sma3 !== null && Math.abs(sma3 - 106.3333) < 0.01, `SMA3 should be ~106.33, got ${sma3}`);
}

// Test Next-Bar Open Fill & SL execution
{
  console.log('Testing Next-Bar Open Fill & SL Execution...');
  // Strategy: buy on bar 0. Should fill at bar 1 open (102).
  // SL at 97, TP at 120.
  // On bar 3 (low 95), SL should trigger at 97.
  const code = `
    function onBar(ctx) {
      if (ctx.index === 0) {
        return { action: 'buy', sl: 97, tp: 120 };
      }
      return null;
    }
  `;

  const fn = compileStrategyCode(code);
  const result = runSimulation(testBars, fn);

  assert(result.trades.length === 1, `Expected 1 trade, got ${result.trades.length}`);
  const trade = result.trades[0];
  assert(trade.side === 'buy', 'Trade should be buy');
  assert(trade.entryPrice === 102, `Entry price should be 102 (bar 1 open), got ${trade.entryPrice}`);
  assert(trade.exitPrice === 97, `Exit price should be SL 97, got ${trade.exitPrice}`);
  assert(trade.reason === 'SL', `Exit reason should be SL, got ${trade.reason}`);
  assert(trade.pnl === -5, `PnL should be -5 (97 - 102), got ${trade.pnl}`);
  console.log('Fill & SL test passed!');
}

// Test Take Profit execution
{
  console.log('Testing Take Profit execution...');
  // Strategy: buy on bar 0 (fills at bar 1 open = 102).
  // SL at 90, TP at 108.
  // Bar 1 high is 108 -> TP should trigger at 108!
  const code = `
    function onBar(ctx) {
      if (ctx.index === 0) {
        return { action: 'buy', sl: 90, tp: 108 };
      }
      return null;
    }
  `;

  const fn = compileStrategyCode(code);
  const result = runSimulation(testBars, fn);

  assert(result.trades.length === 1, `Expected 1 trade, got ${result.trades.length}`);
  const trade = result.trades[0];
  assert(trade.exitPrice === 108, `Exit price should be TP 108, got ${trade.exitPrice}`);
  assert(trade.reason === 'TP', `Reason should be TP, got ${trade.reason}`);
  assert(trade.pnl === 6, `PnL should be +6 (108 - 102), got ${trade.pnl}`);
  console.log('TP test passed!');
}

// Test TradingView Performance Summary & Subsets
{
  console.log('Testing TradingView Performance Summary & Subsets...');
  const mockTrades: any = [
    { side: 'buy', pnl: 200, entryTime: 100, exitTime: 200, barsInTrade: 2, runUp: 250, drawdown: 50 },
    { side: 'sell', pnl: -100, entryTime: 300, exitTime: 400, barsInTrade: 4, runUp: 20, drawdown: 120 },
    { side: 'buy', pnl: 150, entryTime: 500, exitTime: 600, barsInTrade: 3, runUp: 180, drawdown: 30 },
  ];
  const { stats } = calculateSimulationStats(mockTrades, 10000, testBars);
  assert(stats.all !== undefined, 'stats.all should be defined');
  assert(stats.long !== undefined, 'stats.long should be defined');
  assert(stats.short !== undefined, 'stats.short should be defined');

  // Long trades: 2 trades, both wins (+200, +150) -> net +350
  assert(stats.long.totalTrades === 2, `Long trades = 2, got ${stats.long.totalTrades}`);
  assert(stats.long.winningTrades === 2, `Long wins = 2, got ${stats.long.winningTrades}`);
  assert(stats.long.netProfit === 350, `Long net = 350, got ${stats.long.netProfit}`);
  assert(stats.long.winRate === 100, `Long win rate = 100%, got ${stats.long.winRate}`);

  // Short trades: 1 trade, loss (-100)
  assert(stats.short.totalTrades === 1, `Short trades = 1, got ${stats.short.totalTrades}`);
  assert(stats.short.losingTrades === 1, `Short losses = 1, got ${stats.short.losingTrades}`);
  assert(stats.short.netProfit === -100, `Short net = -100, got ${stats.short.netProfit}`);

  // All trades: net 250
  assert(stats.all.totalTrades === 3, 'All trades = 3');
  assert(stats.all.netProfit === 250, 'All net = 250');
  assert(stats.all.grossProfit === 350, 'All gross profit = 350');
  assert(stats.all.grossLoss === 100, 'All gross loss = 100');
  assert(stats.all.largestWin === 200, 'Largest win = 200');
  assert(stats.all.largestLoss === 100, 'Largest loss = 100');
  assert(stats.all.avgBarsInTrade === 3.0, `Avg bars = 3.0, got ${stats.all.avgBarsInTrade}`);

  console.log('TradingView subsets & performance summary passed!');
}

console.log('--- All engine tests passed successfully! ---');
