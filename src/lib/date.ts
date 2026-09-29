import { addDays, eachDayOfInterval, format, startOfDay } from 'date-fns';

/** Local calendar day, e.g. "2026-09-28". Matches are grouped by the viewer's day, not UTC. */
export const dayKey = (d: Date | string): string => format(typeof d === 'string' ? new Date(d) : d, 'yyyy-MM-dd');

/** ESPN `dates=` value for a single day: YYYYMMDD. */
export const espnDay = (d: Date): string => format(d, 'yyyyMMdd');

/**
 * ESPN rejects `dates=YYYYMMDD-YYYYMMDD` ranges with HTTP 400, but accepts a whole month (YYYYMM).
 * Returns every month touched by [from, to], in order.
 */
export function espnMonths(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    months.push(format(cursor, 'yyyyMM'));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export const WINDOW_PAST_DAYS = 7;
export const WINDOW_FUTURE_DAYS = 14;

export function dayWindow(today: Date, past = WINDOW_PAST_DAYS, future = WINDOW_FUTURE_DAYS): Date[] {
  const start = startOfDay(today);
  return eachDayOfInterval({ start: addDays(start, -past), end: addDays(start, future) });
}

/** "viernes 2 de octubre" -> "Viernes 2 de octubre" (CSS capitalize would also uppercase "de"). */
export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Day to open on: today if it has matches, else the nearest later day with matches, else the latest earlier one.
 * `keys` are day keys ("yyyy-MM-dd") that have matches.
 */
export function pickDefaultDay(keys: string[], today: string): string {
  if (keys.includes(today)) return today;
  const sorted = [...keys].sort();
  return sorted.find((k) => k > today) ?? sorted.at(-1) ?? today;
}
