import { parseAndValidateCandles } from './csvImporter';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

console.log('--- Running lib/data/csvImporter.test.ts ---');

// 1. Plain CSV format test
{
  console.log('Testing plain CSV format...');
  const csv = `time,open,high,low,close,volume
1728518400,2650.5,2655.0,2648.0,2652.0,150
1728518700,2652.0,2656.2,2651.1,2655.4,180
1728519000,2655.4,2658.0,2653.0,2654.1,210`;

  const res = parseAndValidateCandles(csv, 'XAUUSD');
  assert(res.candles.length === 3, `Expected 3 candles, got ${res.candles.length}`);
  assert(res.detectedTimeframe === '5m', `Expected 5m, got ${res.detectedTimeframe}`);
  assert(res.meta.count === 3, 'Meta count 3');
  assert(res.meta.startDate === '2024-10-10', 'Start date 2024-10-10');
  console.log('Plain CSV test passed!');
}

// 2. MT5 Tab-separated Export Bars format test
{
  console.log('Testing MT5 Tab-separated Export Bars format...');
  const mt5Text = `<DATE>\t<TIME>\t<OPEN>\t<HIGH>\t<LOW>\t<CLOSE>\t<TICKVOL>\t<VOL>\t<SPREAD>
2024.10.10\t00:00:00\t2650.50\t2655.00\t2648.00\t2652.00\t150\t0\t12
2024.10.10\t00:05:00\t2652.00\t2656.20\t2651.10\t2655.40\t180\t0\t12
2024.10.10\t00:10:00\t2655.40\t2658.00\t2653.00\t2654.10\t210\t0\t12`;

  const res = parseAndValidateCandles(mt5Text, 'XAUUSD');
  assert(res.candles.length === 3, `Expected 3 candles, got ${res.candles.length}`);
  assert(res.candles[0].open === 2650.50, `Expected open 2650.50, got ${res.candles[0].open}`);
  assert(res.candles[1].time === 1728518400 + 300, `Second bar time should be +300s`);
  assert(res.detectedTimeframe === '5m', 'Detected 5m base timeframe');
  console.log('MT5 format test passed!');
}

// 3. Validation: row number error on invalid price (High < Low)
{
  console.log('Testing validation row error on high < low...');
  const badCsv = `time,open,high,low,close,volume
1728518400,2650.5,2655.0,2648.0,2652.0,150
1728518700,2652.0,2640.0,2655.0,2655.4,180`; // Row 3: high 2640 < low 2655

  let caught = false;
  try {
    parseAndValidateCandles(badCsv, 'XAUUSD');
  } catch (err: any) {
    caught = true;
    assert(err.message.includes('Row 3'), `Error should mention Row 3: ${err.message}`);
  }
  assert(caught, 'Should have thrown row validation error');
  console.log('Row error validation passed!');
}

// 4. Validation: duplicate timestamp error
{
  console.log('Testing duplicate timestamp validation...');
  const dupCsv = `time,open,high,low,close,volume
1728518400,2650.5,2655.0,2648.0,2652.0,150
1728518400,2650.5,2655.0,2648.0,2652.0,150`;

  let caught = false;
  try {
    parseAndValidateCandles(dupCsv, 'XAUUSD');
  } catch (err: any) {
    caught = true;
    assert(err.message.includes('Row 3') && err.message.includes('Duplicate'), `Expected Row 3 duplicate error: ${err.message}`);
  }
  assert(caught, 'Should catch duplicate timestamp');
  console.log('Duplicate timestamp validation passed!');
}

// 5. Validation: negative price error
{
  console.log('Testing negative price validation...');
  const negCsv = `time,open,high,low,close,volume
1728518400,-10,2655.0,2648.0,2652.0,150`;

  let caught = false;
  try {
    parseAndValidateCandles(negCsv, 'XAUUSD');
  } catch (err: any) {
    caught = true;
    assert(err.message.includes('Row 2') && err.message.includes('Negative'), `Expected Row 2 negative error: ${err.message}`);
  }
  assert(caught, 'Should catch negative price');
  console.log('Negative price validation passed!');
}

console.log('ALL CSV IMPORTER TESTS PASSED SUCCESSFULLY!');
