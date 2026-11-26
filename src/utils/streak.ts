import { Transaction } from '../types';
import { todayISO } from './stats';

export interface StreakInfo {
  /** Consecutive logged days ending today or yesterday (missed days forgiven with bones). */
  current: number;
  /** Longest fully-consecutive run in the whole history. */
  longest: number;
  /** Total distinct days with at least one transaction. */
  daysLogged: number;
  /** Bones earned: one per every 5 logged days. */
  bonesEarned: number;
  /** Bones still available after forgiving missed days in the current streak. */
  bonesLeft: number;
  /** True if today already has at least one transaction. */
  loggedToday: boolean;
  /** ISO dates logged within the current week (Monday-based), for the paw row. */
  weekDates: string[];
  /** Next badge still to reach (null when everything is earned). */
  nextBadge: { label: string; days: number; needed: number } | null;
}

export const STREAK_BADGES: { label: string; days: number }[] = [
  { label: 'First Paws', days: 3 },
  { label: 'Week Keeper', days: 7 },
  { label: 'Fortnight Friend', days: 14 },
  { label: 'Month Wanderer', days: 30 },
  { label: 'Deep Trail', days: 60 },
  { label: 'Century Walk', days: 100 },
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday-based start of the week containing `d`. */
function weekStart(d: Date): Date {
  const s = new Date(d);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  s.setDate(d.getDate() - dow);
  return s;
}

/**
 * Streak stats derived straight from the transaction dates — nothing is
 * stored separately, so erasing all data also erases the streak, and
 * importing/backdating keeps it accurate. A "bone" (earned per 5 logged
 * days) forgives one missed day inside the current streak, Boop-style.
 */
export function computeStreak(txs: Transaction[], now: Date = new Date()): StreakInfo {
  const logged = new Set(txs.map((t) => t.date));
  const dates = [...logged].sort();

  const today = todayISO(now);
  const yesterday = (() => {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return toISO(y);
  })();

  const daysLogged = logged.size;
  const bonesEarned = Math.floor(daysLogged / 5);

  // ---- current streak (walk backward from today, forgiving misses with bones) ----
  let bonesLeft = bonesEarned;
  let cursor = new Date(now);
  let current = 0;
  if (!logged.has(today)) cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  while (true) {
    const iso = toISO(cursor);
    if (logged.has(iso)) {
      current += 1;
    } else {
      if (bonesLeft > 0 && current > 0) {
        bonesLeft -= 1; // the corgi digs up a bone
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
    // hard stop far in the past so an empty ledger never loops forever
    if (current === 0 && cursor.getTime() < now.getTime() - 400 * 86400000) break;
  }

  // ---- longest plain-consecutive run ----
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const iso of dates) {
    if (prev) {
      const [py, pm, pd] = prev.split('-').map(Number);
      const d = new Date(py, pm - 1, pd);
      d.setDate(d.getDate() + 1);
      run = toISO(d) === iso ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = iso;
  }

  // ---- current week paws (Monday..Sunday) ----
  const start = weekStart(now);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weekDates.push(toISO(d));
  }

  // ---- next badge ----
  const achieved = STREAK_BADGES.filter((b) => current >= b.days);
  const nextIdx = achieved.length;
  const nextBadge =
    nextIdx < STREAK_BADGES.length
      ? {
          label: STREAK_BADGES[nextIdx].label,
          days: STREAK_BADGES[nextIdx].days,
          needed: STREAK_BADGES[nextIdx].days - current,
        }
      : null;

  void yesterday; // kept for clarity; handled via the cursor start above
  return {
    current,
    longest: Math.max(longest, current),
    daysLogged,
    bonesEarned,
    bonesLeft,
    loggedToday: logged.has(today),
    weekDates,
    nextBadge,
  };
}
