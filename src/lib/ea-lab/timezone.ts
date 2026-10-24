/**
 * Timezone helpers for Africa/Lagos (UTC+1).
 * "DAILY" means the day the test was executed in Africa/Lagos,
 * while raw MT5 backtest server times are kept intact.
 */

export function getLagosDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'UNKNOWN_DATE';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatLagosDateDisplay(dateStrOrObj: Date | string): string {
  let d: Date;
  if (typeof dateStrOrObj === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStrOrObj)) {
    // String like "2026-10-11"
    const [y, m, day] = dateStrOrObj.split('-').map(Number);
    d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  } else {
    d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  }

  if (isNaN(d.getTime())) return String(dateStrOrObj);

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatLagosDateTimeDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Lagos',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}
