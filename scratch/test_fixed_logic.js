const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function computeRMultiple(direction, entry, sl, exitPrice) {
  if (exitPrice == null || sl == null || isNaN(exitPrice) || isNaN(sl)) {
    return null;
  }
  if (direction === 'buy') {
    const risk = entry - sl;
    if (risk <= 0.000001) return null;
    return Number(((exitPrice - entry) / risk).toFixed(2));
  } else {
    const risk = sl - entry;
    if (risk <= 0.000001) return null;
    return Number(((entry - exitPrice) / risk).toFixed(2));
  }
}

function parseLogLine(line) {
  const parts = line.split('\t');
  let wallClock;
  let testTime;
  let message = '';
  if (parts.length >= 3) {
    wallClock = parts[0].trim();
    testTime = parts[1].trim();
    const rest = parts.slice(2).join('\t').trim();
    const timeMatch = rest.match(/^(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s+(.*)$/);
    if (timeMatch) {
      testTime = timeMatch[1].trim();
      message = timeMatch[2].trim();
    } else {
      message = rest;
    }
  } else {
    const raw = line.trim();
    const doubleTimeMatch = raw.match(
      /^(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s+(.*)$/
    );
    if (doubleTimeMatch) {
      wallClock = doubleTimeMatch[1].trim();
      testTime = doubleTimeMatch[2].trim();
      message = doubleTimeMatch[3].trim();
    } else {
      const singleTimeMatch = raw.match(
        /^(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(.*)$/
      );
      if (singleTimeMatch) {
        wallClock = singleTimeMatch[1].trim();
        message = singleTimeMatch[2].trim();
      } else {
        message = raw;
      }
    }
  }
  return { wallClock, testTime, message };
}

function parseSingleRunFixed(runLog) {
  const lines = runLog.split(/\r?\n/);
  let eaFile = 'ExpertAdvisor.ex5';
  let symbol = 'UNKNOWN';
  let timeframe = null;
  let periodFrom = null;
  let periodTo = null;
  let initialDeposit = 10000;
  let currency = 'USD';
  let leverage = '1:100';
  let finalBalance = 10000;
  let hasExplicitFinalBalance = false;
  const inputsJson = {};
  const trades = [];
  const tradesByTicket = new Map();
  const closingDealsToEntry = new Map(); // closingDealTicket -> entryDealTicket
  const closedDealTickets = new Set();
  const pendingCloseByPosition = new Map(); // posTicket -> { exitPrice, exitReason, testTime }

  let inInputsBlock = false;
  let pendingMarketInfo = null;

  for (let i = 0; i < lines.length; i++) {
    const { testTime, message } = parseLogLine(lines[i]);
    if (!message) continue;

    if (
      /MetaTester/i.test(message) ||
      /successfully initialized/i.test(message) ||
      /account info loaded/i.test(message) ||
      /initialization finished/i.test(message)
    ) {
      continue;
    }

    // Header match
    const testHeaderMatch = message.match(
      /^([^,]+),([A-Za-z0-9]+):\s*testing of (?:Experts\\)?([^\s]+) from ([\d\.\:\s]+) to ([\d\.\:\s]+) started with inputs:/i
    );
    if (testHeaderMatch) {
      symbol = testHeaderMatch[1].trim();
      timeframe = testHeaderMatch[2].trim();
      periodFrom = testHeaderMatch[4].trim();
      periodTo = testHeaderMatch[5].trim();
      inInputsBlock = true;
      continue;
    }

    if (inInputsBlock) {
      const inputMatch = message.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (inputMatch) {
        inputsJson[inputMatch[1].trim()] = inputMatch[2].trim();
        continue;
      } else if (message.startsWith('===') || message.startsWith('//') || /^\s*$/.test(message)) {
        continue;
      } else {
        inInputsBlock = false;
      }
    }

    const depositMatch = message.match(/initial deposit\s+([\d\.]+)\s+([A-Z]+),\s+leverage\s+([\d:]+)/i);
    if (depositMatch) {
      initialDeposit = parseFloat(depositMatch[1]);
      currency = depositMatch[2];
      leverage = depositMatch[3];
      continue;
    }

    const finalBalanceMatch = message.match(/final balance\s+(-?[\d.,\s]*\d)\s*([A-Z]{3})?\b/i);
    if (finalBalanceMatch) {
      const parsedBal = parseFloat(finalBalanceMatch[1].replace(/[,\s]/g, ''));
      if (!isNaN(parsedBal)) {
        finalBalance = parsedBal;
        hasExplicitFinalBalance = true;
      }
      continue;
    }

    // 6. Market order declaration: SL and TP both optional!
    // e.g. "CTrade::OrderSend: market buy 2.33 BTCUSD sl: 63031.385 [done at 63116.957]"
    // or "market buy 2.33 BTCUSD sl: 63031.385 (63114.533 / ...)"
    // or "market sell 0.79 Volatility 75 (1s) Index sl: 5069.28 tp: 4688.08"
    const marketOrderMatch = message.match(
      /(?:CTrade::OrderSend:\s+)?market\s+(buy|sell)\s+([\d\.]+)\s+(.*?)(?:\s+sl:\s*([\d\.]+))?(?:\s+tp:\s*([\d\.]+))?(?:\s*\[|\s*\(|$)/i
    );
    // Ignore if this is a closing order (e.g. "market buy 1.6 BTCUSD, close #8")
    const isClosingOrder = /close\s*#(\d+)|position\s*#(\d+)/i.test(message);
    if (marketOrderMatch && !isClosingOrder) {
      const dir = marketOrderMatch[1].toLowerCase();
      const lots = parseFloat(marketOrderMatch[2]);
      const sym = marketOrderMatch[3].trim();
      const sl = marketOrderMatch[4] ? parseFloat(marketOrderMatch[4]) : null;
      const tp = marketOrderMatch[5] ? parseFloat(marketOrderMatch[5]) : null;
      if (symbol === 'UNKNOWN' && sym) symbol = sym;

      pendingMarketInfo = {
        direction: dir,
        lots,
        sl: sl && sl > 0 ? sl : null,
        tp: tp && tp > 0 ? tp : null,
      };
      continue;
    }

    // Close position directive: "market buy 1.6 BTCUSD, close #8" or "CTrade::OrderSend: market buy 1.60 position #8 BTCUSD [done at 62947.734]"
    const closePosMatch = message.match(/(?:close\s*#|position\s*#)(\d+).*?\[done at ([\d\.]+)\]|market\s+(?:buy|sell)\s+[\d\.]+\s+.*?,?\s*close\s*#(\d+)/i);
    if (closePosMatch) {
      const posTicket = closePosMatch[1] || closePosMatch[3];
      const donePrice = closePosMatch[2] ? parseFloat(closePosMatch[2]) : null;
      if (posTicket) {
        pendingCloseByPosition.set(posTicket, {
          exitPrice: donePrice,
          exitReason: /trailing/i.test(message) ? 'TRAILING' : 'TP',
          testTime,
        });
      }
    }

    // SL Trigger match
    const slTriggerMatch = message.match(
      /stop loss triggered #(\d+)(?:.*?\[#(\d+)\s+(?:buy|sell)\s+[\d\.]+(?:.*?)at\s+([\d\.]+)|.*?at\s+([\d\.]+))/i
    );
    if (slTriggerMatch) {
      const entryDealTicket = slTriggerMatch[1];
      const closingDealTicket = slTriggerMatch[2];
      const closingFill = slTriggerMatch[3] ? parseFloat(slTriggerMatch[3]) : (slTriggerMatch[4] ? parseFloat(slTriggerMatch[4]) : undefined);

      if (closingDealTicket) {
        closingDealsToEntry.set(closingDealTicket, entryDealTicket);
        closedDealTickets.add(closingDealTicket);
      }

      const targetTrade = tradesByTicket.get(entryDealTicket);
      if (targetTrade) {
        if (closingFill !== undefined) {
          targetTrade.exitPrice = closingFill;
          targetTrade.exitReason = 'SL';
          targetTrade.closedAt = testTime;
          targetTrade.rMultiple = computeRMultiple(targetTrade.direction, targetTrade.entry, targetTrade.sl, closingFill);
        }
      }
      continue;
    }

    // Deal match
    const entryDealMatch = message.match(
      /deal #(\d+)\s+(sell|buy)\s+([\d\.]+)\s+(.*?)\s+at\s+([\d\.]+)\s+done/i
    );
    if (entryDealMatch) {
      const dealNumber = entryDealMatch[1];
      const direction = entryDealMatch[2].toLowerCase();
      const lots = parseFloat(entryDealMatch[3]);
      const sym = entryDealMatch[4].trim();
      const fillPrice = parseFloat(entryDealMatch[5]);

      if (symbol === 'UNKNOWN' && sym) symbol = sym;

      // 1. Is this deal a registered closing deal from SL or TP trigger?
      if (closingDealsToEntry.has(dealNumber)) {
        const entryTicket = closingDealsToEntry.get(dealNumber);
        const tr = tradesByTicket.get(entryTicket);
        if (tr) {
          tr.exitPrice = fillPrice;
          if (!tr.closedAt) tr.closedAt = testTime;
          if (tr.rMultiple == null) {
            tr.rMultiple = computeRMultiple(tr.direction, tr.entry, tr.sl, fillPrice);
          }
        }
        closedDealTickets.add(dealNumber);
        continue;
      }

      // 2. Is this deal in closedDealTickets?
      if (closedDealTickets.has(dealNumber)) {
        continue;
      }

      // 3. Did we have a pending close for a position?
      let matchedPos = false;
      for (const [posId, closeInfo] of pendingCloseByPosition.entries()) {
        const tr = tradesByTicket.get(posId);
        if (tr && !tr.closedAt && tr.direction !== direction) {
          tr.exitPrice = fillPrice;
          tr.exitReason = closeInfo.exitReason || 'TP';
          tr.closedAt = testTime;
          tr.rMultiple = computeRMultiple(tr.direction, tr.entry, tr.sl, fillPrice);
          pendingCloseByPosition.delete(posId);
          closedDealTickets.add(dealNumber);
          matchedPos = true;
          break;
        }
      }
      if (matchedPos) continue;

      // 4. Check if there's an open opposite trade with same lots
      const openOpposite = trades.find(t => !t.closedAt && t.direction !== direction && Math.abs(t.lots - lots) < 0.001);
      if (openOpposite) {
        openOpposite.exitPrice = fillPrice;
        openOpposite.exitReason = 'OTHER';
        openOpposite.closedAt = testTime;
        openOpposite.rMultiple = computeRMultiple(openOpposite.direction, openOpposite.entry, openOpposite.sl, fillPrice);
        closedDealTickets.add(dealNumber);
        continue;
      }

      // New Trade Entry!
      let sl = null;
      let tp = null;
      if (pendingMarketInfo && pendingMarketInfo.direction === direction) {
        sl = pendingMarketInfo.sl;
        tp = pendingMarketInfo.tp;
        pendingMarketInfo = null;
      }

      const newTrade = {
        ticket: dealNumber,
        openedAt: testTime,
        direction,
        lots,
        entry: fillPrice,
        sl,
        tp,
      };

      trades.push(newTrade);
      tradesByTicket.set(dealNumber, newTrade);
      continue;
    }
  }

  // Calculate profit
  const contractSize = 1.0; // BTCUSD contract size is 1.0
  let totalProfit = 0;
  for (const t of trades) {
    if (t.exitPrice != null) {
      const prof = t.direction === 'buy' ? (t.exitPrice - t.entry) * t.lots * contractSize : (t.entry - t.exitPrice) * t.lots * contractSize;
      t.profit = Number(prof.toFixed(2));
      totalProfit += t.profit;
      if (t.rMultiple == null && t.sl != null) {
        t.rMultiple = computeRMultiple(t.direction, t.entry, t.sl, t.exitPrice);
      }
    }
  }

  return {
    symbol,
    trades,
    initialDeposit,
    finalBalance,
    netProfit: Number((finalBalance - initialDeposit).toFixed(2)),
  };
}

async function main() {
  const latestRun = await prisma.eaTestRun.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rawLog: true },
  });

  const parsed = parseSingleRunFixed(latestRun.rawLog);
  console.log('Fixed Parse Summary:');
  console.log('Total Trades Extracted:', parsed.trades.length);
  
  const closed = parsed.trades.filter(t => t.exitPrice != null);
  const withSL = parsed.trades.filter(t => t.sl != null);
  const withR = parsed.trades.filter(t => t.rMultiple != null);
  const wins = closed.filter(t => t.profit > 0);
  const losses = closed.filter(t => t.profit < 0);

  console.log({
    total: parsed.trades.length,
    closed: closed.length,
    withSL: withSL.length,
    withR: withR.length,
    wins: wins.length,
    losses: losses.length,
    winRate: Number(((wins.length / closed.length) * 100).toFixed(1)) + '%',
  });

  console.log('Sample 3 Wins:');
  console.log(wins.slice(0, 3));
  console.log('Sample 3 Losses:');
  console.log(losses.slice(0, 3));
}

main().catch(console.error).finally(() => prisma.$disconnect());
