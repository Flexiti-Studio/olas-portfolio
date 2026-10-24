const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Let's test the regex and trade matching
async function test() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true, initialDeposit: true, finalBalance: true },
  });

  if (!latestRun || !latestRun.rawLog) return;
  const rawLog = latestRun.rawLog;

  console.log('Testing rawLog length:', rawLog.length);

  // Test marketOrder regex
  const testLine = "CTrade::OrderSend: market buy 2.33 BTCUSD sl: 63031.385 [done at 63116.957]";
  const testLine2 = "2026.08.01 08:55:28   market buy 2.33 BTCUSD sl: 63031.385 (63114.533 / 63116.957 / 63114.533)";
  
  // Improved regex: optional tp
  const regex = /(?:CTrade::OrderSend:\s+)?market\s+(buy|sell)\s+([\d\.]+)\s+(.*?)\s+sl:\s*([\d\.]+)(?:\s+tp:\s*([\d\.]+))?/i;
  
  console.log('Match 1:', testLine.match(regex));
  console.log('Match 2:', testLine2.match(regex));
}

test().catch(console.error).finally(() => prisma.$disconnect());
