export interface MonthData {
  income: number;
  expenses: number;
}

export function calculateMonth(
  income: number,
  categoryAmounts: number[],
  savePercent: number,    // e.g., 20 for 20%
  investPercent: number   // e.g., 30 for 30%
) {
  const expenses = categoryAmounts.reduce((sum, amount) => sum + amount, 0);
  const leftOver = income - expenses;
  const keptPercent = income > 0 ? leftOver / income : 0;
  
  const saveAmount = leftOver > 0 ? leftOver * (savePercent / 100) : 0;
  const investAmount = leftOver > 0 ? leftOver * (investPercent / 100) : 0;
  const bufferAmount = leftOver - saveAmount - investAmount;

  return {
    expenses,
    leftOver,
    keptPercent,
    saveAmount,
    investAmount,
    bufferAmount
  };
}

export function calculateYearSummary(months: MonthData[], savePercent: number, investPercent: number) {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSaveAndInvest = 0;
  let monthsEntered = 0;

  for (const m of months) {
    if (m.income > 0 || m.expenses > 0) {
      monthsEntered++;
      totalIncome += m.income;
      totalExpenses += m.expenses;
      
      const leftOver = m.income - m.expenses;
      if (leftOver > 0) {
        totalSaveAndInvest += leftOver * ((savePercent + investPercent) / 100);
      }
    }
  }

  const expensesPercent = totalIncome > 0 ? totalExpenses / totalIncome : 0;
  const leftOverSoFar = totalIncome - totalExpenses;
  const keptPercent = totalIncome > 0 ? leftOverSoFar / totalIncome : 0;

  return {
    totalIncome,
    totalExpenses,
    expensesPercent,
    leftOverSoFar,
    keptPercent,
    totalSaveAndInvest,
    monthsEntered
  };
}

export function calculateProjection(
  months: MonthData[],
  investPercent: number,
  annualReturn: number, // e.g., 10 for 10%
  years: number
) {
  const positiveMonths = months.filter(m => (m.income - m.expenses) > 0);
  const sumSurplus = positiveMonths.reduce((sum, m) => sum + (m.income - m.expenses), 0);
  const avgSurplus = positiveMonths.length > 0 ? sumSurplus / positiveMonths.length : 0;

  const monthlyInvest = avgSurplus * (investPercent / 100);
  const r = (annualReturn / 100) / 12;
  const n = years * 12;

  let futureValue = 0;
  if (r > 0) {
    futureValue = monthlyInvest * ((Math.pow(1 + r, n) - 1) / r);
  } else {
    futureValue = monthlyInvest * n;
  }

  const totalInvested = monthlyInvest * n;
  const growth = futureValue - totalInvested;

  return {
    avgSurplus,
    monthlyInvest,
    totalInvested,
    growth,
    futureValue
  };
}
