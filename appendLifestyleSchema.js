const fs = require('fs');

const content = `
// -----------------------------------------------------------------------------
// LIFESTYLE COST PLANNER
// -----------------------------------------------------------------------------

model MonthlyBudget {
  id        String   @id @default(cuid())
  userId    String
  year      Int
  month     Int      // 0-11
  income    Decimal  @default(0)
  expenses  ExpenseEntry[]
  updatedAt DateTime @updatedAt

  @@unique([userId, year, month])
  @@map("monthly_budgets")
}

model ExpenseEntry {
  id        String   @id @default(cuid())
  budgetId  String
  budget    MonthlyBudget @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  category  String
  amount    Decimal  @default(0)

  @@unique([budgetId, category])
  @@map("expense_entries")
}

model BudgetSettings {
  userId        String   @id
  categories    String[]
  savePercent   Int      @default(20)
  investPercent Int      @default(30)
  annualReturn  Decimal  @default(10)
  years         Int      @default(5)

  @@map("budget_settings")
}
`;

fs.appendFileSync('prisma/schema.prisma', content);
