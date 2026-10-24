import { ICandle, Timeframe } from '../flexStrategy/engine/types';

export interface BaseDatasetMeta {
  symbol: string;
  baseTimeframe: Timeframe;
  count: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ParseResult {
  candles: ICandle[];
  detectedTimeframe: Timeframe;
  meta: BaseDatasetMeta;
}

/**
 * Parses user-uploaded candle data.
 * Supports:
 * 1. MT5 "Export Bars" format (tab-separated, columns like <DATE> <TIME> <OPEN> <HIGH> <LOW> <CLOSE> <TICKVOL> <VOL> <SPREAD>)
 * 2. Standard CSV (comma-separated with time/date, open, high, low, close, volume)
 *
 * Validations:
 * - Sorted ascending by time
 * - No duplicates
 * - No negative prices
 * - No zero-range garbage (high >= low, high >= open, high >= close, low <= open, low <= close)
 * - Returns row number on validation errors
 */
export function parseAndValidateCandles(rawText: string, symbol = 'XAUUSD'): ParseResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('File is empty.');
  }

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error('File must contain a header and at least 2 candle rows.');
  }

  // Detect delimiter: tab or comma or semicolon
  const firstLine = lines[0];
  const isTab = firstLine.includes('\t');
  const delimiter = isTab ? '\t' : firstLine.includes(';') ? ';' : ',';

  const rawHeaders = firstLine.split(delimiter).map((h) => h.trim().replace(/^<|>$/g, '').toLowerCase());

  // Check if MT5 separated format: <DATE> and <TIME>
  const dateIdx = rawHeaders.findIndex((h) => h === 'date' || h === 'd' || h.includes('date'));
  const timeIdx = rawHeaders.findIndex((h) => h === 'time' || h === 'timestamp' || h.includes('time'));
  const openIdx = rawHeaders.findIndex((h) => h === 'open' || h === 'o');
  const highIdx = rawHeaders.findIndex((h) => h === 'high' || h === 'h');
  const lowIdx = rawHeaders.findIndex((h) => h === 'low' || h === 'l');
  const closeIdx = rawHeaders.findIndex((h) => h === 'close' || h === 'c');
  const volIdx = rawHeaders.findIndex((h) => h.includes('vol') || h === 'v');

  // Verify essential price columns
  if (openIdx < 0 || highIdx < 0 || lowIdx < 0 || closeIdx < 0) {
    throw new Error(
      `Invalid header row: Missing one or more required columns (open, high, low, close). Found columns: [${rawHeaders.join(', ')}]`
    );
  }

  const isDualDateTime = dateIdx >= 0 && timeIdx >= 0 && dateIdx !== timeIdx;
  const singleTimeIdx = timeIdx >= 0 ? timeIdx : dateIdx;

  if (singleTimeIdx < 0 && !isDualDateTime) {
    throw new Error('Invalid header row: No date or time column found.');
  }

  const candles: ICandle[] = [];
  const seenTimestamps = new Set<number>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed human row number
    const cols = lines[i].split(delimiter).map((c) => c.trim());
    if (cols.length < 4) {
      throw new Error(`Row ${rowNum}: Insufficient columns. Expected at least 4 columns, got ${cols.length}.`);
    }

    let timestampSeconds = 0;
    if (isDualDateTime) {
      // E.g. MT5: "2024.10.10" and "00:05:00"
      const dateStr = cols[dateIdx].replace(/\./g, '-');
      const timeStr = cols[timeIdx];
      const isoCombined = `${dateStr}T${timeStr.includes(':') ? timeStr : timeStr + ':00'}Z`;
      const parsedMs = Date.parse(isoCombined);
      if (isNaN(parsedMs)) {
        // Try direct space concatenation
        const altMs = Date.parse(`${cols[dateIdx]} ${cols[timeIdx]}`);
        if (isNaN(altMs)) {
          throw new Error(`Row ${rowNum}: Invalid date/time format "${cols[dateIdx]} ${cols[timeIdx]}".`);
        }
        timestampSeconds = Math.floor(altMs / 1000);
      } else {
        timestampSeconds = Math.floor(parsedMs / 1000);
      }
    } else {
      const timeRaw = cols[singleTimeIdx];
      if (/^\d+$/.test(timeRaw)) {
        const num = parseInt(timeRaw, 10);
        timestampSeconds = num > 1e11 ? Math.floor(num / 1000) : num;
      } else {
        const parsedMs = Date.parse(timeRaw);
        if (isNaN(parsedMs)) {
          throw new Error(`Row ${rowNum}: Invalid timestamp "${timeRaw}".`);
        }
        timestampSeconds = Math.floor(parsedMs / 1000);
      }
    }

    if (!timestampSeconds || isNaN(timestampSeconds)) {
      throw new Error(`Row ${rowNum}: Could not parse a valid Unix timestamp.`);
    }

    const open = parseFloat(cols[openIdx]);
    const high = parseFloat(cols[highIdx]);
    const low = parseFloat(cols[lowIdx]);
    const close = parseFloat(cols[closeIdx]);
    const volume = volIdx >= 0 && cols[volIdx] ? parseFloat(cols[volIdx]) : 1;

    // Validations
    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
      throw new Error(`Row ${rowNum}: Non-numeric price detected (open: ${cols[openIdx]}, high: ${cols[highIdx]}, low: ${cols[lowIdx]}, close: ${cols[closeIdx]}).`);
    }

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
      throw new Error(`Row ${rowNum}: Negative or zero price detected. All prices must be positive.`);
    }

    if (high < low) {
      throw new Error(`Row ${rowNum}: High (${high}) is less than Low (${low}).`);
    }

    if (open > high || close > high) {
      throw new Error(`Row ${rowNum}: Open (${open}) or Close (${close}) exceeds High (${high}).`);
    }

    if (open < low || close < low) {
      throw new Error(`Row ${rowNum}: Open (${open}) or Close (${close}) is below Low (${low}).`);
    }

    // Check duplicate timestamp
    if (seenTimestamps.has(timestampSeconds)) {
      throw new Error(`Row ${rowNum}: Duplicate timestamp found (${new Date(timestampSeconds * 1000).toISOString()}).`);
    }
    seenTimestamps.add(timestampSeconds);

    candles.push({
      time: timestampSeconds,
      open,
      high,
      low,
      close,
      volume: isNaN(volume) || volume < 0 ? 0 : volume,
    });
  }

  // Validate sorted by time
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].time <= candles[i - 1].time) {
      throw new Error(
        `Row ${i + 2}: Candles must be sorted in ascending chronological order. Timestamp ${candles[i].time} is <= previous ${candles[i - 1].time}.`
      );
    }
  }

  // Detect base timeframe from minimal difference between consecutive bars
  let minDiff = Infinity;
  for (let i = 1; i < Math.min(candles.length, 50); i++) {
    const diff = candles[i].time - candles[i - 1].time;
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
    }
  }

  const detectedTimeframe = inferTimeframeFromSeconds(minDiff);

  const startUtc = new Date(candles[0].time * 1000).toISOString().split('T')[0];
  const endUtc = new Date(candles[candles.length - 1].time * 1000).toISOString().split('T')[0];

  const meta: BaseDatasetMeta = {
    symbol,
    baseTimeframe: detectedTimeframe,
    count: candles.length,
    startDate: startUtc,
    endDate: endUtc,
  };

  return {
    candles,
    detectedTimeframe,
    meta,
  };
}

function inferTimeframeFromSeconds(sec: number): Timeframe {
  if (sec <= 60) return '1m';
  if (sec <= 180) return '3m';
  if (sec <= 300) return '5m';
  if (sec <= 900) return '15m';
  if (sec <= 1800) return '30m';
  if (sec <= 3600) return '1h';
  if (sec <= 14400) return '4h';
  return '1d';
}
