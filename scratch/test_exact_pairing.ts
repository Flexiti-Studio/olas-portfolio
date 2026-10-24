import { prisma } from '../src/lib/prisma';

// Exact position and deal tracker
function testPairing(rawLog: string) {
  const lines = rawLog.split(/\r?\n/);
  
  // Track open positions by position ID (which is the entry deal ticket or order ticket)
  interface Position {
    ticket: string;
    openedAt: string;
    direction: 'buy' | 'sell';
    initialLots: number;
    remainingLots: number;
    entry: number;
    sl: number | null;
    tp: number | null;
    tag?: string;
    closedAt?: string;
    closedParts: {
      dealTicket: string;
      closedAt: string;
      lots: number;
      exitPrice: number;
      exitReason: string;
      profit: number;
    }[];
  }

  const positions = new Map<string, Position>();
  const allCompletedPositions: Position[] = [];
  const closedDealTickets = new Set<string>();

  let pendingMarketInfo: {
    direction: 'buy' | 'sell';
    lots: number;
    sl: number | null;
    tp: number | null;
    tag?: string;
  } | null = null;

  // Track next closing position from "close #N" or "position #N"
  let pendingClosePosId: string | null = null;
  let pendingCloseReason: string = 'OTHER';

  for (const line of lines) {
    const parts = line.split('\t');
    const message = parts.length >= 3 ? parts.slice(2).join('\t').trim() : line.trim();
    const testTime = parts.length >= 3 ? parts[1].trim() : '';

    if (!message) continue;

    // Market order declaration (entry)
    const isClosingOrder = /close\s*#(\d+)|position\s*#(\d+)/i.test(message);
    const marketOrderMatch = message.match(
      /(?:CTrade::OrderSend:\s+)?market\s+(buy|sell)\s+([\d\.]+)\s+(.*?)(?:\s+sl:\s*([\d\.]+))?(?:\s+tp:\s*([\d\.]+))?(?:\s*\[|\s*\(|$)/i
    );
    if (marketOrderMatch && !isClosingOrder) {
      const dir = marketOrderMatch[1].toLowerCase() as 'buy' | 'sell';
      const lots = parseFloat(marketOrderMatch[2]);
      const sl = marketOrderMatch[4] ? parseFloat(marketOrderMatch[4]) : null;
      const tp = marketOrderMatch[5] ? parseFloat(marketOrderMatch[5]) : null;
      pendingMarketInfo = {
        direction: dir,
        lots,
        sl: sl && sl > 0 ? sl : null,
        tp: tp && tp > 0 ? tp : null,
      };
      continue;
    }

    // Trailing exit notice
    if (/Trailing exit/i.test(message)) {
      pendingCloseReason = 'TRAILING';
    }

    // Close position directive: "market buy 1.6 BTCUSD, close #8" or "position #8"
    const closePosMatch = message.match(/(?:close\s*#|position\s*#)(\d+)/i);
    if (closePosMatch) {
      pendingClosePosId = closePosMatch[1];
      if (/1\.0:1/i.test(message)) pendingCloseReason = 'TP';
    }

    // Stop loss trigger
    const slMatch = message.match(/stop loss triggered #(\d+)(?:.*?\[#(\d+))?/i);
    if (slMatch) {
      pendingClosePosId = slMatch[1];
      pendingCloseReason = 'SL';
      if (slMatch[2]) closedDealTickets.add(slMatch[2]);
    }

    // Take profit trigger
    const tpMatch = message.match(/take profit triggered #(\d+)(?:.*?\[#(\d+))?/i);
    if (tpMatch) {
      pendingClosePosId = tpMatch[1];
      pendingCloseReason = 'TP';
      if (tpMatch[2]) closedDealTickets.add(tpMatch[2]);
    }

    // End of test close
    const endMatch = message.match(/position closed due end of test at ([\d\.]+)(?:.*?\[#(\d+))?/i);
    if (endMatch) {
      const closingDeal = endMatch[2];
      if (closingDeal) closedDealTickets.add(closingDeal);
    }

    // Deal line: "deal #N (buy|sell) <lots> <symbol> at <price> done"
    const dealMatch = message.match(/deal #(\d+)\s+(sell|buy)\s+([\d\.]+)\s+(.*?)\s+at\s+([\d\.]+)\s+done/i);
    if (dealMatch) {
      const dealTicket = dealMatch[1];
      const direction = dealMatch[2].toLowerCase() as 'buy' | 'sell';
      const lots = parseFloat(dealMatch[3]);
      const fillPrice = parseFloat(dealMatch[5]);

      // Check if this deal is closing an existing position:
      // 1) Explicit pendingClosePosId
      let targetPos: Position | undefined = pendingClosePosId ? positions.get(pendingClosePosId) : undefined;
      
      // 2) If not, check if deal is in closedDealTickets or if any open position of opposite direction matches
      if (!targetPos && closedDealTickets.has(dealTicket)) {
        // find most recent open opposite position
        targetPos = Array.from(positions.values()).reverse().find(p => p.remainingLots > 0.0001 && p.direction !== direction);
      }
      if (!targetPos) {
        // check if any open opposite position matches remaining lots
        targetPos = Array.from(positions.values()).find(p => p.remainingLots > 0.0001 && p.direction !== direction && Math.abs(p.remainingLots - lots) < 0.01);
      }

      if (targetPos && targetPos.remainingLots > 0.0001 && targetPos.direction !== direction) {
        // Closing deal!
        const closeLots = Math.min(lots, targetPos.remainingLots);
        targetPos.remainingLots = Number((targetPos.remainingLots - closeLots).toFixed(4));
        const prof = targetPos.direction === 'buy'
          ? (fillPrice - targetPos.entry) * closeLots
          : (targetPos.entry - fillPrice) * closeLots;

        targetPos.closedParts.push({
          dealTicket,
          closedAt: testTime,
          lots: closeLots,
          exitPrice: fillPrice,
          exitReason: pendingCloseReason || 'OTHER',
          profit: Number(prof.toFixed(2)),
        });

        if (targetPos.remainingLots <= 0.0001) {
          targetPos.closedAt = testTime;
          allCompletedPositions.push(targetPos);
          positions.delete(targetPos.ticket);
        }

        closedDealTickets.add(dealTicket);
        pendingClosePosId = null;
        pendingCloseReason = 'OTHER';
        continue;
      }

      // Otherwise: New Position Entry!
      const sl = pendingMarketInfo && pendingMarketInfo.direction === direction ? pendingMarketInfo.sl : null;
      const tp = pendingMarketInfo && pendingMarketInfo.direction === direction ? pendingMarketInfo.tp : null;
      pendingMarketInfo = null;

      const newPos: Position = {
        ticket: dealTicket,
        openedAt: testTime,
        direction,
        initialLots: lots,
        remainingLots: lots,
        entry: fillPrice,
        sl,
        tp,
        closedParts: [],
      };

      positions.set(dealTicket, newPos);
      pendingClosePosId = null;
      pendingCloseReason = 'OTHER';
    }
  }

  // Summary
  console.log('Total Positions Opened:', allCompletedPositions.length + positions.size);
  console.log('Completed Positions:', allCompletedPositions.length);
  console.log('Still Open Positions:', positions.size);

  let totalNetProfit = 0;
  let winCount = 0;
  let lossCount = 0;

  for (const pos of allCompletedPositions) {
    const posProfit = pos.closedParts.reduce((sum, p) => sum + p.profit, 0);
    totalNetProfit += posProfit;
    if (posProfit > 0.01) winCount++;
    else if (posProfit < -0.01) lossCount++;
  }

  console.log({
    completedTrades: allCompletedPositions.length,
    winCount,
    lossCount,
    winRate: Number(((winCount / allCompletedPositions.length) * 100).toFixed(1)) + '%',
    totalNetProfit: Number(totalNetProfit.toFixed(2)),
  });

  console.log('\nFirst 5 Completed Positions:');
  for (const p of allCompletedPositions.slice(0, 5)) {
    const prof = p.closedParts.reduce((sum, cp) => sum + cp.profit, 0);
    console.log({
      ticket: p.ticket,
      dir: p.direction,
      lots: p.initialLots,
      entry: p.entry,
      sl: p.sl,
      parts: p.closedParts.length,
      profit: Number(prof.toFixed(2)),
    });
  }
}

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  if (!latestRun || !latestRun.rawLog) return;
  testPairing(latestRun.rawLog);
}

main().catch(console.error).finally(() => prisma.$disconnect());
