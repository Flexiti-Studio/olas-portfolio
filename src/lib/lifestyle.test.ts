import { calculateMonth, calculateYearSummary, calculateProjection } from './lifestyle';

// Helper for assertions
function assertAlmostEqual(actual: number, expected: number, tolerance = 0.001) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

// 1. Normal Month
{
  console.log("Testing Normal Month...");
  const res = calculateMonth(1000, [400, 100], 20, 30);
  assertAlmostEqual(res.expenses, 500);
  assertAlmostEqual(res.leftOver, 500);
  assertAlmostEqual(res.keptPercent, 0.5);
  assertAlmostEqual(res.saveAmount, 100);
  assertAlmostEqual(res.investAmount, 150);
  assertAlmostEqual(res.bufferAmount, 250);
}

// 2. Deficit Month
{
  console.log("Testing Deficit Month...");
  const res = calculateMonth(1000, [800, 300], 20, 30);
  assertAlmostEqual(res.expenses, 1100);
  assertAlmostEqual(res.leftOver, -100);
  assertAlmostEqual(res.keptPercent, -0.1);
  assertAlmostEqual(res.saveAmount, 0); // No savings on deficit
  assertAlmostEqual(res.investAmount, 0);
  assertAlmostEqual(res.bufferAmount, -100);
}

// 3. Empty Month
{
  console.log("Testing Empty Month...");
  const res = calculateMonth(0, [], 20, 30);
  assertAlmostEqual(res.expenses, 0);
  assertAlmostEqual(res.leftOver, 0);
  assertAlmostEqual(res.keptPercent, 0);
  assertAlmostEqual(res.saveAmount, 0);
  assertAlmostEqual(res.investAmount, 0);
  assertAlmostEqual(res.bufferAmount, 0);
}

// 4. Sliders summing to 100%
{
  console.log("Testing Sliders Summing to 100%...");
  const res = calculateMonth(1000, [200], 60, 40);
  assertAlmostEqual(res.leftOver, 800);
  assertAlmostEqual(res.saveAmount, 480);
  assertAlmostEqual(res.investAmount, 320);
  assertAlmostEqual(res.bufferAmount, 0);
}

// 5. 0% Return Projection
{
  console.log("Testing 0% Return Projection...");
  // 1 month of 1000 surplus, 1 month of -500 deficit
  const months = [
    { income: 2000, expenses: 1000 },
    { income: 1000, expenses: 1500 }
  ];
  // avgSurplus = 1000 (only positive months)
  // monthlyInvest = 1000 * 50% = 500
  // n = 5 years = 60 months
  const res = calculateProjection(months, 50, 0, 5);
  assertAlmostEqual(res.avgSurplus, 1000);
  assertAlmostEqual(res.monthlyInvest, 500);
  assertAlmostEqual(res.totalInvested, 30000);
  assertAlmostEqual(res.futureValue, 30000);
  assertAlmostEqual(res.growth, 0);
}

// 6. Year Summary Calculation
{
  console.log("Testing Year Summary...");
  const months = [
    { income: 2000, expenses: 1000 }, // +1000
    { income: 1000, expenses: 1500 }, // -500
    { income: 0, expenses: 0 }        // Ignored
  ];
  const res = calculateYearSummary(months, 20, 30);
  assertAlmostEqual(res.totalIncome, 3000);
  assertAlmostEqual(res.totalExpenses, 2500);
  assertAlmostEqual(res.leftOverSoFar, 500);
  assertAlmostEqual(res.monthsEntered, 2);
  // Saved and invested only on the positive month (1000 * 50% = 500)
  assertAlmostEqual(res.totalSaveAndInvest, 500);
}

console.log("All tests passed!");
