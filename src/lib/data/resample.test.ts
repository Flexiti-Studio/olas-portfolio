import { resample, isAllowedMultiple } from './resample';
import { ICandle } from '../flexStrategy/engine/types';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

console.log('--- Running lib/data/resample.test.ts ---');

// 1. Test 12 five-minute candles -> one 1h candle with correct OHLCV
{
  console.log('Testing 12 5m candles -> 1 1h candle...');
  // 12 candles starting from 2024-10-10 00:00:00 UTC (1728518400)
  const base5m: ICandle[] = [];
  const start = 1728518400; // aligned to hour boundary

  for (let i = 0; i < 12; i++) {
    const t = start + i * 300;
    // prices: open varies, high, low, close
    base5m.push({
      time: t,
      open: 100 + i,
      high: 110 + i * 2, // max will be at i=11 -> 110 + 22 = 132
      low: 90 - i,       // min will be at i=11 -> 90 - 11 = 79
      close: 105 + i,    // last close will be at i=11 -> 116
      volume: 10,        // sum will be 120
    });
  }

  const res1h = resample(base5m, '1h');
  assert(res1h.length === 1, `Expected 1 1h candle, got ${res1h.length}`);
  const c = res1h[0];
  assert(c.time === start, `Bucket time should be ${start}, got ${c.time}`);
  assert(c.open === 100, `Open should be first candle open (100), got ${c.open}`);
  assert(c.high === 132, `High should be max high (132), got ${c.high}`);
  assert(c.low === 79, `Low should be min low (79), got ${c.low}`);
  assert(c.close === 116, `Close should be last close (116), got ${c.close}`);
  assert(c.volume === 120, `Volume should be sum of volumes (120), got ${c.volume}`);
  console.log('12 5m -> 1h test passed!');
}

// 2. Test partial last bucket handled correctly (e.g. 15 5m candles = 1 full 1h candle + 1 partial 15m into second hour)
{
  console.log('Testing partial last bucket handled...');
  const base5m: ICandle[] = [];
  const start = 1728518400;

  for (let i = 0; i < 15; i++) {
    base5m.push({
      time: start + i * 300,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 5,
    });
  }

  const res1h = resample(base5m, '1h');
  assert(res1h.length === 2, `Expected 2 candles, got ${res1h.length}`);
  // Bucket 1: 12 bars (0 to 11)
  assert(res1h[0].open === 100, `Bucket 1 open 100, got ${res1h[0].open}`);
  assert(res1h[0].volume === 60, `Bucket 1 volume 60, got ${res1h[0].volume}`);

  // Bucket 2: 3 bars (12, 13, 14)
  assert(res1h[1].time === start + 3600, `Bucket 2 time should be start + 3600`);
  assert(res1h[1].open === 100 + 12, `Bucket 2 open 112, got ${res1h[1].open}`);
  assert(res1h[1].close === 102 + 14, `Bucket 2 close 116, got ${res1h[1].close}`);
  assert(res1h[1].volume === 15, `Bucket 2 volume 15, got ${res1h[1].volume}`);
  console.log('Partial last bucket test passed!');
}

// 3. Test no look-ahead: bar only contains data up to its own timestamps
{
  console.log('Testing no look-ahead...');
  const base5m: ICandle[] = [
    { time: 1728518400, open: 10, high: 20, low: 5, close: 15, volume: 1 },
    { time: 1728518400 + 300, open: 15, high: 25, low: 10, close: 20, volume: 1 },
  ];
  const res1h = resample(base5m, '1h');
  assert(res1h.length === 1, 'Should have 1 candle');
  assert(res1h[0].high === 25, 'High is strictly max of available bars');
  console.log('No look-ahead test passed!');
}

// 4. Test isAllowedMultiple
{
  console.log('Testing isAllowedMultiple...');
  assert(isAllowedMultiple('5m', '15m') === true, '5m -> 15m is multiple');
  assert(isAllowedMultiple('5m', '1h') === true, '5m -> 1h is multiple');
  assert(isAllowedMultiple('5m', '4h') === true, '5m -> 4h is multiple');
  assert(isAllowedMultiple('5m', '1d') === true, '5m -> 1d is multiple');
  assert(isAllowedMultiple('5m', '3m') === false, '5m -> 3m is not multiple');
  assert(isAllowedMultiple('5m', '1m') === false, '5m -> 1m is smaller than base');
  console.log('isAllowedMultiple test passed!');
}

console.log('ALL RESAMPLE UNIT TESTS PASSED SUCCESSFULLY!');
