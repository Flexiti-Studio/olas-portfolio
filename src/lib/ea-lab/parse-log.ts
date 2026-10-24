/**
 * Pure functions for parsing MetaTrader 5 Strategy Tester logs.
 */

export interface ParsedTrade {
  ticket: string; // Entry deal number (#N)
  openedAt?: string; // Test time
  closedAt?: string;
  direction: 'buy' | 'sell';
  lots: number;
  entry: number; // Entry fill price from deal #N
  sl?: number | null;
  tp?: number | null;
  exitPrice?: number | null; // Exit fill price from deal #M
  exitReason?: 'TP' | 'SL' | 'END_OF_TEST' | 'OTHER';
  tag?: string;
  rMultiple?: number | null;
  profit?: number | null; // Exact mechanical profit in account currency
}

export interface ParsedRun {
  eaFile: string;
  symbol: string;
  timeframe: string;
  periodFrom?: string;
  periodTo?: string;
  initialDeposit: number;
  currency: string;
  leverage: string;
  finalBalance: number;
  netProfit: number;
  returnPct: number;
  contractSize: number;
  tradeProfitSum: number;
  reconciliationDiff: number; // netProfit - tradeProfitSum
  inputsJson: Record<string, string>;
  trades: ParsedTrade[];
  skipCounts: Record<string, number>;
  errorCount: number;
  errors: string[];
  breakCount: number;
  retestCount: number;
  rawLog: string;
}

/**
 * Symbol contract size mapping.
 * Synthetic indices like Volatility 75 (1s) Index have a contract size of 1.0.
 */
export const SYMBOL_CONTRACT_SIZES: Record<string, number> = {
  'Volatility 75 (1s) Index': 1.0,
  'Volatility 75 Index': 1.0,
  'Volatility 100 (1s) Index': 1.0,
  'Volatility 100 Index': 1.0,
  'Volatility 50 (1s) Index': 1.0,
  'Volatility 50 Index': 1.0,
  'Volatility 25 (1s) Index': 1.0,
  'Volatility 25 Index': 1.0,
  'Volatility 10 (1s) Index': 1.0,
  'Volatility 10 Index': 1.0,
  'Crash 1000 Index': 1.0,
  'Boom 1000 Index': 1.0,
  'Crash 500 Index': 1.0,
  'Boom 500 Index': 1.0,
  'Crash 300 Index': 1.0,
  'Boom 300 Index': 1.0,
  'Step Index': 1.0,
};

export function getContractSizeForSymbol(symbol: string): number {
  if (!symbol) return 1.0;
  const clean = symbol.trim();
  if (SYMBOL_CONTRACT_SIZES[clean] !== undefined) {
    return SYMBOL_CONTRACT_SIZES[clean];
  }
  for (const [key, size] of Object.entries(SYMBOL_CONTRACT_SIZES)) {
    if (clean.toLowerCase().includes(key.toLowerCase())) {
      return size;
    }
  }
  return 1.0;
}

/**
 * Computes R-multiple from entry, SL, and exit prices.
 * BUY:  (exitPrice - entry) / (entry - sl)
 * SELL: (entry - exitPrice) / (sl - entry)
 */
export function computeRMultiple(
  direction: 'buy' | 'sell',
  entry: number,
  sl?: number | null,
  exitPrice?: number | null
): number | null {
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

/**
 * Computes mechanical trade profit in account currency.
 * buy:  (exit - entry) * lots * contractSize
 * sell: (entry - exit) * lots * contractSize
 */
export function computeTradeProfit(
  direction: 'buy' | 'sell',
  lots: number,
  entry: number,
  exitPrice?: number | null,
  contractSize = 1.0
): number | null {
  if (exitPrice == null || isNaN(exitPrice)) return null;
  if (direction === 'buy') {
    return Number(((exitPrice - entry) * lots * contractSize).toFixed(2));
  } else {
    return Number(((entry - exitPrice) * lots * contractSize).toFixed(2));
  }
}

/**
 * Extracts line parts: wall-clock time, test time, and message.
 * Handles MT5 logs with tab delimiters or variable space formatting.
 */
export function parseLogLine(line: string): {
  wallClock?: string;
  testTime?: string;
  message: string;
} {
  const parts = line.split('\t');
  let wallClock: string | undefined;
  let testTime: string | undefined;
  let message = '';

  if (parts.length >= 3) {
    wallClock = parts[0].trim();
    testTime = parts[1].trim();
    message = parts.slice(2).join('\t').trim();
  } else if (parts.length === 2) {
    wallClock = parts[0].trim();
    const rest = parts[1].trim();
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

  if (!testTime && message) {
    const leadingTimeMatch = message.match(/^(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s+(.*)$/);
    if (leadingTimeMatch) {
      testTime = leadingTimeMatch[1].trim();
      message = leadingTimeMatch[2].trim();
    }
  }

  return {
    wallClock,
    testTime,
    message,
  };
}

/**
 * Splits a full raw log string into individual test run chunks.
 * Splits tests at each "testing of Experts\<name>.ex5 from <date> to <date> started with inputs:" line.
 * Each test continues until the next test start or end of log.
 */
export function splitLogIntoRuns(rawLog: string): string[] {
  const lines = rawLog.split(/\r?\n/);
  if (lines.length === 0) return [];

  const startIndices: number[] = [];
  const testStartRegex = /testing of (?:Experts\\)?[^\s]+ from [\d\.\:\s]+ to [\d\.\:\s]+ started with inputs:/i;

  for (let i = 0; i < lines.length; i++) {
    if (testStartRegex.test(lines[i])) {
      // Look back for "expert file added:" or "initial deposit" or "MetaTester"
      let chunkStart = i;
      while (
        chunkStart > 0 &&
        chunkStart > i - 40 &&
        !testStartRegex.test(lines[chunkStart - 1]) &&
        !/final balance/i.test(lines[chunkStart - 1]) &&
        (/expert file added:/i.test(lines[chunkStart - 1]) ||
          /initial deposit/i.test(lines[chunkStart - 1]) ||
          /MetaTester/i.test(lines[chunkStart - 1]) ||
          /^\s*$/.test(lines[chunkStart - 1]))
      ) {
        chunkStart--;
      }
      startIndices.push(chunkStart);
    }
  }

  if (startIndices.length <= 1) {
    return [rawLog.trim()];
  }

  const runs: string[] = [];
  for (let s = 0; s < startIndices.length; s++) {
    const fromIdx = startIndices[s];
    const toIdx = s + 1 < startIndices.length ? startIndices[s + 1] : lines.length;
    const chunk = lines.slice(fromIdx, toIdx).join('\n').trim();
    if (chunk) {
      runs.push(chunk);
    }
  }

  return runs;
}

/**
 * Parses a single Strategy Tester run log chunk.
 */
export function parseSingleRun(runLog: string): ParsedRun {
  const lines = runLog.split(/\r?\n/);

  let eaFile = 'ExpertAdvisor.ex5';
  let symbol = 'UNKNOWN';
  let timeframe = 'H1';
  let periodFrom: string | undefined;
  let periodTo: string | undefined;
  let initialDeposit = 10000;
  let currency = 'USD';
  let leverage = '1:100';
  let finalBalance = 10000;
  let hasExplicitFinalBalance = false;
  const inputsJson: Record<string, string> = {};

  const trades: ParsedTrade[] = [];
  const tradesByTicket = new Map<string, ParsedTrade>();

  // Buffer to capture pending SL/TP and Tag from market / CTrade lines
  let pendingMarketInfo: {
    direction: 'buy' | 'sell';
    lots: number;
    sl?: number | null;
    tp?: number | null;
    tag?: string;
  } | null = null;

  // Track pending exits awaiting closing deal confirmation
  interface PendingExit {
    entryTicket: string;
    exitReason: 'TP' | 'SL' | 'END_OF_TEST' | 'OTHER';
    exitDealTicket?: string;
    triggerPrice?: number;
    testTime?: string;
  }
  const pendingExitsByDealTicket = new Map<string, PendingExit>();
  const pendingExitsByEntryTicket = new Map<string, PendingExit>();
  const closingDealsToEntry = new Map<string, string>();
  const closedDealTickets = new Set<string>();
  const pendingCloseByPosition = new Map<string, { exitPrice?: number | null; exitReason?: string; testTime?: string }>();

  const skipCounts: Record<string, number> = {};
  const errors: string[] = [];
  let breakCount = 0;
  let retestCount = 0;
  let inInputsBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const { testTime, message } = parseLogLine(rawLine);
    if (!message) continue;

    // Discover symbol from synchronization or test initialization line if not yet known
    if (symbol === 'UNKNOWN') {
      const syncMatch = message.match(/^([^:]+):\s*symbol (?:to be synchronized|synchronized)/i);
      if (syncMatch) {
        symbol = syncMatch[1].trim();
      } else {
        const symbolLineMatch = message.match(/^([A-Za-z0-9\s\(\)\.\-]+):\s*(?:symbol|testing|ticks)/i);
        if (symbolLineMatch && !/^(?:Alert|CTrade|MetaTester|AMD|Intel)/i.test(symbolLineMatch[1])) {
          symbol = symbolLineMatch[1].trim();
        }
      }
    }

    // Filter/Ignore noisy auxiliary lines
    if (
      message.startsWith('Alert:') ||
      /command check error/i.test(message) ||
      /symbol to be synchronized/i.test(message) ||
      /symbol synchronized/i.test(message) ||
      /history synchronization/i.test(message) ||
      /load \d+ bytes of history/i.test(message) ||
      /history cache allocated/i.test(message) ||
      /history begins from/i.test(message) ||
      /every tick generating/i.test(message) ||
      /^\d+ Mb available/i.test(message) ||
      /successfully initialized/i.test(message) ||
      /bytes of account info loaded/i.test(message) ||
      /bytes of tester parameters/i.test(message) ||
      /bytes of input parameters/i.test(message) ||
      /bytes of symbols list/i.test(message) ||
      /login \(build \d+\)/i.test(message) ||
      /cloud network mode/i.test(message) ||
      /initialization finished/i.test(message)
    ) {
      continue;
    }

    // Diagnostics counting
    if (/Retest skipped:\s*(.+)/i.test(message)) {
      const reason = message.match(/Retest skipped:\s*(.+)/i)![1].trim();
      const key = `Retest skipped: ${reason}`;
      skipCounts[key] = (skipCounts[key] || 0) + 1;
      continue;
    }
    if (/Signal skipped:\s*(.+)/i.test(message)) {
      const reason = message.match(/Signal skipped:\s*(.+)/i)![1].trim();
      const key = `Signal skipped: ${reason}`;
      skipCounts[key] = (skipCounts[key] || 0) + 1;
      continue;
    }
    if (/\bBREAK\b/i.test(message)) {
      breakCount++;
      continue;
    }
    if (/\bRETEST\b/i.test(message)) {
      retestCount++;
      continue;
    }
    if (/OrderSend failed:/i.test(message) || /Order failed/i.test(message)) {
      errors.push(message);
      continue;
    }

    // 1. EA File added:
    const eaFileAddedMatch = message.match(/expert file added:\s*(?:Experts\\)?([^\s\\/]+\.ex5)/i);
    if (eaFileAddedMatch) {
      eaFile = eaFileAddedMatch[1].trim();
      continue;
    }

    // 2. Test Header: symbol, timeframe, period, inputs header
    const testHeaderMatch = message.match(
      /^([^,]+),([A-Za-z0-9]+):\s*testing of (?:Experts\\)?([^\s]+) from ([\d\.\:\s]+) to ([\d\.\:\s]+) started with inputs:/i
    );
    if (testHeaderMatch) {
      symbol = testHeaderMatch[1].trim();
      timeframe = testHeaderMatch[2].trim();
      if (!eaFile || eaFile === 'ExpertAdvisor.ex5') {
        const filePart = testHeaderMatch[3].trim().split('\\').pop() || '';
        if (filePart) eaFile = filePart;
      }
      periodFrom = testHeaderMatch[4].trim();
      periodTo = testHeaderMatch[5].trim();
      inInputsBlock = true;
      continue;
    }

    // 3. Inputs block
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

    // 4. Initial deposit & leverage
    const depositMatch = message.match(/initial deposit\s+([\d\.]+)\s+([A-Z]+),\s+leverage\s+([\d:]+)/i);
    if (depositMatch) {
      initialDeposit = parseFloat(depositMatch[1]);
      currency = depositMatch[2];
      leverage = depositMatch[3];
      continue;
    }

    // 5. Final balance: "final balance 10295.87 USD" or "final balance 11037.59 USD"
    const finalBalanceMatch = message.match(/final balance\s+(-?[\d.,\s]*\d)\s*([A-Z]{3})?\b/i);
    if (finalBalanceMatch) {
      const parsedBal = parseFloat(finalBalanceMatch[1].replace(/[,\s]/g, ''));
      if (!isNaN(parsedBal)) {
        finalBalance = parsedBal;
        hasExplicitFinalBalance = true;
        if (finalBalanceMatch[2]) currency = finalBalanceMatch[2].toUpperCase();
      }
      continue;
    }

    // 6. Market order declaration: capture SL, TP, and Tag
    // e.g. "CTrade::OrderSend: market buy 2.33 BTCUSD sl: 63031.385 [done at 63116.957]"
    // or "market buy 2.33 BTCUSD sl: 63031.385 (63114.533 / ...)"
    // or "market sell 0.79 Volatility 75 (1s) Index sl: 5069.28 tp: 4688.08"
    const isClosingOrder = /close\s*#(\d+)|position\s*#(\d+)/i.test(message);
    const marketOrderMatch = message.match(
      /(?:CTrade::OrderSend:\s+)?market\s+(buy|sell)\s+([\d\.]+)\s+(.*?)(?:\s+sl:\s*([\d\.]+))?(?:\s+tp:\s*([\d\.]+))?(?:\s*\[|\s*\(|$)/i
    );
    if (marketOrderMatch && !isClosingOrder) {
      const dir = marketOrderMatch[1].toLowerCase() as 'buy' | 'sell';
      const lots = parseFloat(marketOrderMatch[2]);
      const sym = marketOrderMatch[3].trim();
      const sl = marketOrderMatch[4] ? parseFloat(marketOrderMatch[4]) : null;
      const tp = marketOrderMatch[5] ? parseFloat(marketOrderMatch[5]) : null;
      if (symbol === 'UNKNOWN' && sym) {
        symbol = sym;
      }
      const curPending: { direction: 'buy' | 'sell'; lots: number; tag?: string } | null = pendingMarketInfo;
      const existingTag: string | undefined =
        curPending && curPending.direction === dir && Math.abs(curPending.lots - lots) < 0.001
          ? curPending.tag
          : undefined;

      pendingMarketInfo = {
        direction: dir,
        lots,
        sl: sl && sl > 0 ? sl : null,
        tp: tp && tp > 0 ? tp : null,
        tag: existingTag,
      };
      continue;
    }

    // 6b. Position close directive: "market buy 1.6 BTCUSD, close #8" or "CTrade::OrderSend: market buy 1.60 position #8 BTCUSD [done at 62947.734]"
    const closePosMatch = message.match(/(?:close\s*#|position\s*#)(\d+)/i);
    if (closePosMatch) {
      const posTicket = closePosMatch[1];
      const donePriceMatch = message.match(/\[done at ([\d\.]+)\]/i);
      const donePrice = donePriceMatch ? parseFloat(donePriceMatch[1]) : null;
      let exitReason = 'OTHER';
      if (/trailing/i.test(message)) exitReason = 'TRAILING';
      else if (/1\.0:1/i.test(message) || /reached/i.test(message)) exitReason = 'TP';
      else if (/stop loss/i.test(message) || /sl/i.test(message)) exitReason = 'SL';

      pendingCloseByPosition.set(posTicket, {
        exitPrice: donePrice,
        exitReason,
        testTime,
      });
    }

    // EA Comment line with tag: "SELL 0.79 lots @ 4942.21 | SL ... | TP ... (RetestBO)"
    const eaTagMatch = message.match(/(buy|sell)\s+([\d\.]+)\s+lots.*?\((\w+)\)/i);
    if (eaTagMatch) {
      const tagDir = eaTagMatch[1].toLowerCase() as 'buy' | 'sell';
      const tagLots = parseFloat(eaTagMatch[2]);
      const tag = eaTagMatch[3].trim();
      if (pendingMarketInfo && pendingMarketInfo.direction === tagDir && Math.abs(pendingMarketInfo.lots - tagLots) < 0.001) {
        pendingMarketInfo.tag = tag;
      } else if (!pendingMarketInfo) {
        pendingMarketInfo = {
          direction: tagDir,
          lots: tagLots,
          tag,
        };
      } else {
        // Find most recent un-tagged trade matching direction and lots
        const matchingTrade = trades.slice().reverse().find(
          (t) => !t.tag && t.direction === tagDir && Math.abs(t.lots - tagLots) < 0.001
        );
        if (matchingTrade) {
          matchingTrade.tag = tag;
        } else {
          pendingMarketInfo.tag = tag;
        }
      }
      continue;
    }

    // 7. Entry: match "deal #N sell|buy <lots> <symbol> at <price> done"
    // e.g. "deal #2 sell 0.79 Volatility 75 (1s) Index at 4942.21 done (based on order #2)"
    const entryDealMatch = message.match(
      /deal #(\d+)\s+(sell|buy)\s+([\d\.]+)\s+(.*?)\s+at\s+([\d\.]+)\s+done/i
    );
    if (entryDealMatch) {
      const dealNumber = entryDealMatch[1];
      const direction = entryDealMatch[2].toLowerCase() as 'buy' | 'sell';
      const lots = parseFloat(entryDealMatch[3]);
      const sym = entryDealMatch[4].trim();
      const fillPrice = parseFloat(entryDealMatch[5]);

      if (symbol === 'UNKNOWN' && sym) symbol = sym;

      // 1. Is this deal a registered closing deal from SL or TP trigger?
      if (closingDealsToEntry.has(dealNumber)) {
        const entryTicket = closingDealsToEntry.get(dealNumber)!;
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

      // 2. Already known as closing deal
      if (closedDealTickets.has(dealNumber)) {
        continue;
      }

      // 3. Did we have a pending close for a position (e.g. trailing exit or partial TP)?
      let matchedPos = false;
      for (const [posId, closeInfo] of pendingCloseByPosition.entries()) {
        const tr = tradesByTicket.get(posId);
        if (tr && tr.direction !== direction) {
          const prevClosedLots = (tr as any).closedLots || 0;
          const newClosedLots = prevClosedLots + lots;
          if (tr.exitPrice != null && prevClosedLots > 0) {
            tr.exitPrice = Number(((tr.exitPrice * prevClosedLots + fillPrice * lots) / newClosedLots).toFixed(3));
          } else {
            tr.exitPrice = fillPrice;
          }
          (tr as any).closedLots = newClosedLots;
          tr.exitReason = closeInfo.exitReason || 'TP';
          tr.closedAt = testTime;
          tr.rMultiple = computeRMultiple(tr.direction, tr.entry, tr.sl, tr.exitPrice);

          if (Math.abs(tr.lots - newClosedLots) < 0.01 || newClosedLots >= tr.lots) {
            pendingCloseByPosition.delete(posId);
          }
          closedDealTickets.add(dealNumber);
          matchedPos = true;
          break;
        }
      }
      if (matchedPos) continue;

      // 4. Check if this deal is a pending exit
      const pendingExit =
        pendingExitsByDealTicket.get(dealNumber) ||
        (pendingExitsByEntryTicket.size > 0
          ? Array.from(pendingExitsByEntryTicket.values()).find((pe) => {
              const tr = tradesByTicket.get(pe.entryTicket);
              return tr && tr.direction !== direction && Math.abs(tr.lots - lots) < 0.001 && !tr.closedAt;
            })
          : undefined);

      if (pendingExit) {
        // This is a closing deal! Close the target trade with this deal's fillPrice
        const targetTrade = tradesByTicket.get(pendingExit.entryTicket);
        if (targetTrade && !targetTrade.closedAt) {
          targetTrade.exitPrice = fillPrice;
          targetTrade.exitReason = pendingExit.exitReason;
          targetTrade.closedAt = testTime || pendingExit.testTime;
          targetTrade.rMultiple = computeRMultiple(
            targetTrade.direction,
            targetTrade.entry,
            targetTrade.sl,
            fillPrice
          );
        }
        pendingExitsByDealTicket.delete(dealNumber);
        pendingExitsByEntryTicket.delete(pendingExit.entryTicket);
        closedDealTickets.add(dealNumber);
        continue;
      }

      // 5. Check if there is an open trade of opposite direction with same lots (e.g. EA close or end of test)
      const openOppositeTrade = trades.find(
        (t) => !t.closedAt && t.direction !== direction && Math.abs(t.lots - lots) < 0.001
      );
      if (openOppositeTrade) {
        openOppositeTrade.exitPrice = fillPrice;
        openOppositeTrade.exitReason = 'OTHER';
        openOppositeTrade.closedAt = testTime;
        openOppositeTrade.rMultiple = computeRMultiple(
          openOppositeTrade.direction,
          openOppositeTrade.entry,
          openOppositeTrade.sl,
          fillPrice
        );
        closedDealTickets.add(dealNumber);
        continue;
      }

      // Otherwise, this deal is a new trade ENTRY!
      let sl: number | null = null;
      let tp: number | null = null;
      let tag: string | undefined;

      if (pendingMarketInfo && pendingMarketInfo.direction === direction) {
        sl = pendingMarketInfo.sl ?? null;
        tp = pendingMarketInfo.tp ?? null;
        tag = pendingMarketInfo.tag;
        pendingMarketInfo = null;
      }

      const newTrade: ParsedTrade = {
        ticket: dealNumber,
        openedAt: testTime,
        direction,
        lots,
        entry: fillPrice,
        sl,
        tp,
        tag,
      };

      trades.push(newTrade);
      tradesByTicket.set(dealNumber, newTrade);
      continue;
    }

    // 8. Exit trigger: "stop loss triggered #N ..."
    // e.g. "stop loss triggered #2 sell 0.79 Volatility 75 (1s) Index 4942.21 sl: 5069.28 tp: 4688.08 [#3 buy 0.79 Volatility 75 (1s) Index at 5069.28]"
    // or "stop loss triggered #2 sell 0.79 at 5069.28 [#3 buy 0.79 at 5069.28]"
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
          targetTrade.rMultiple = computeRMultiple(
            targetTrade.direction,
            targetTrade.entry,
            targetTrade.sl,
            closingFill
          );
        } else {
          // Register pending exit for entryDealTicket, to be filled by the next deal line
          const pe: PendingExit = {
            entryTicket: entryDealTicket,
            exitReason: 'SL',
            exitDealTicket: closingDealTicket,
            testTime,
          };
          if (closingDealTicket) pendingExitsByDealTicket.set(closingDealTicket, pe);
          pendingExitsByEntryTicket.set(entryDealTicket, pe);
        }
      }
      continue;
    }

    // 9. Exit trigger: "take profit triggered #N ..."
    // e.g. "take profit triggered #6 sell 0.74 Volatility 75 (1s) Index 5188.83 sl: 5322.03 tp: 4922.42 [#7 buy 0.74 Volatility 75 (1s) Index at 4922.42]"
    const tpTriggerMatch = message.match(
      /take profit triggered #(\d+)(?:.*?\[#(\d+)\s+(?:buy|sell)\s+[\d\.]+(?:.*?)at\s+([\d\.]+)|.*?at\s+([\d\.]+))/i
    );
    if (tpTriggerMatch) {
      const entryDealTicket = tpTriggerMatch[1];
      const closingDealTicket = tpTriggerMatch[2];
      const closingFill = tpTriggerMatch[3] ? parseFloat(tpTriggerMatch[3]) : (tpTriggerMatch[4] ? parseFloat(tpTriggerMatch[4]) : undefined);

      if (closingDealTicket) {
        closingDealsToEntry.set(closingDealTicket, entryDealTicket);
        closedDealTickets.add(closingDealTicket);
      }

      const targetTrade = tradesByTicket.get(entryDealTicket);
      if (targetTrade) {
        if (closingFill !== undefined) {
          targetTrade.exitPrice = closingFill;
          targetTrade.exitReason = 'TP';
          targetTrade.closedAt = testTime;
          targetTrade.rMultiple = computeRMultiple(
            targetTrade.direction,
            targetTrade.entry,
            targetTrade.sl,
            closingFill
          );
        } else {
          const pe: PendingExit = {
            entryTicket: entryDealTicket,
            exitReason: 'TP',
            exitDealTicket: closingDealTicket,
            testTime,
          };
          if (closingDealTicket) pendingExitsByDealTicket.set(closingDealTicket, pe);
          pendingExitsByEntryTicket.set(entryDealTicket, pe);
        }
      }
      continue;
    }

    // 10. Exit trigger: "position closed due end of test at <price> [#N ..."
    // e.g. "position closed due end of test at 4780.31 [#14 buy 0.21 ...]"
    const endOfTestMatch = message.match(
      /position closed due end of test at ([\d\.]+)(?:.*?\[#(\d+))?/i
    );
    if (endOfTestMatch) {
      const exitPrice = parseFloat(endOfTestMatch[1]);
      const closingDealTicket = endOfTestMatch[2];

      // Find trade that is still open
      const openTrade =
        (closingDealTicket && tradesByTicket.get(closingDealTicket)) ||
        trades.slice().reverse().find((t) => !t.closedAt);

      if (openTrade && !openTrade.closedAt) {
        openTrade.exitPrice = exitPrice;
        openTrade.exitReason = 'END_OF_TEST';
        openTrade.closedAt = testTime;
        openTrade.rMultiple = computeRMultiple(
          openTrade.direction,
          openTrade.entry,
          openTrade.sl,
          exitPrice
        );
      }
      continue;
    }
  }

  // If symbol is still UNKNOWN, check if any trade or line has the symbol
  if (symbol === 'UNKNOWN') {
    for (const t of trades) {
      if ((t as any).symbol && (t as any).symbol !== 'UNKNOWN') {
        symbol = (t as any).symbol;
        break;
      }
    }
  }

  // Calculate mechanical profit for each completed trade
  const contractSize = getContractSizeForSymbol(symbol);
  let tradeProfitSum = 0;

  for (const trade of trades) {
    if (trade.exitPrice != null && trade.closedAt) {
      const prof = computeTradeProfit(
        trade.direction,
        trade.lots,
        trade.entry,
        trade.exitPrice,
        contractSize
      );
      trade.profit = prof;
      if (prof != null) {
        tradeProfitSum = Number((tradeProfitSum + prof).toFixed(2));
      }
      if (trade.rMultiple == null) {
        trade.rMultiple = computeRMultiple(
          trade.direction,
          trade.entry,
          trade.sl,
          trade.exitPrice
        );
      }
    }
  }

  // Net Profit & Return calculations
  let netProfit: number;
  if (hasExplicitFinalBalance) {
    netProfit = Number((finalBalance - initialDeposit).toFixed(2));
  } else {
    netProfit = tradeProfitSum;
    finalBalance = Number((initialDeposit + netProfit).toFixed(2));
  }

  const reconciliationDiff = Number((netProfit - tradeProfitSum).toFixed(2));
  const returnPct = initialDeposit > 0 ? Number(((netProfit / initialDeposit) * 100).toFixed(2)) : 0;

  return {
    eaFile,
    symbol,
    timeframe,
    periodFrom,
    periodTo,
    initialDeposit,
    currency,
    leverage,
    finalBalance,
    netProfit,
    returnPct,
    contractSize,
    tradeProfitSum,
    reconciliationDiff,
    inputsJson,
    trades,
    skipCounts,
    errorCount: errors.length,
    errors,
    breakCount,
    retestCount,
    rawLog: runLog,
  };
}

/**
 * Main parse function: parses a raw log (single or multiple backtests).
 */
export function parseTesterLog(rawLog: string): ParsedRun[] {
  const chunks = splitLogIntoRuns(rawLog);
  const parsed = chunks.map((chunk) => parseSingleRun(chunk));
  if (parsed.length > 1) {
    const valid = parsed.filter(
      (r) => r.trades.length > 0 || r.finalBalance !== 10000 || r.symbol !== 'UNKNOWN'
    );
    return valid.length > 0 ? valid : [parsed[0]];
  }
  return parsed;
}



