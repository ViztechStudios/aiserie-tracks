import { Bill } from '../types';
import { todayISO } from './stats';

/**
 * Next occurrence of a monthly bill, on or after `from` (default today).
 * Returns an ISO date string. Day 29-31 clamps to the month's length.
 */
export function nextDueDate(bill: Bill, fromISO: string = todayISO()): string {
  const [y, m, d] = fromISO.split('-').map((n) => parseInt(n, 10));
  const dayInMonth = (yy: number, mm: number) => {
    const dim = new Date(yy, mm, 0).getDate();
    return Math.min(bill.dueDay, dim);
  };
  const thisMonthDay = dayInMonth(y, m);
  if (d <= thisMonthDay) {
    return `${y}-${String(m).padStart(2, '0')}-${String(thisMonthDay).padStart(2, '0')}`;
  }
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}-${String(dayInMonth(ny, nm)).padStart(2, '0')}`;
}

export function daysUntil(dateISO: string, fromISO: string = todayISO()): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const from = new Date(fy, fm - 1, fd).getTime();
  return Math.round((target - from) / 86400000);
}

/** Bills due within the next `window` days (inclusive), sorted by soonest. */
export function billsDueWithin(bills: Bill[], windowDays: number = 7): { bill: Bill; due: string; days: number }[] {
  return bills
    .map((bill) => {
      const due = nextDueDate(bill);
      return { bill, due, days: daysUntil(due) };
    })
    .filter((x) => x.days <= windowDays)
    .sort((a, b) => a.days - b.days);
}
