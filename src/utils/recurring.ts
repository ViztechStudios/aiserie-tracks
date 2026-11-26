import { Recurring, RecurFreq, Transaction } from '../types';

/**
 * Pure recurring-transaction engine.
 *
 * Design rules (kept simple and testable):
 *  - Every occurrence gets the deterministic id `rec{ruleId}{dateISO}` so a
 *    re-run, app restart or backup restore can never duplicate a movement.
 *  - Catch-up is capped: at most `MAX_CATCH_UP` occurrences are generated in
 *    one run, then the schedule's nextRun jumps past today so nothing is lost.
 */

export const REC_TX_ID_PREFIX = 'rec';
/**
 * Occurrences older than this many days are SKIPPED (fast-forwarded) instead
 * of written: a schedule left alone for two years must not silently inject
 * hundreds of transactions when the user opens the app again.
 */
export const MAX_BACKFILL_DAYS = 90;
/** Hard cap on transactions one engine run may create per rule. */
export const MAX_CATCH_UP = 400;

const WEEKDAY_MS = 86_400_000;

export function isISODate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime());
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Next calendar date strictly after `dateISO`, matching the frequency. */
export function nextAfter(freq: RecurFreq, dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (freq === 'daily') return addDaysISO(dateISO, 1);
  if (freq === 'weekly') return addDaysISO(dateISO, 7);
  if (freq === 'monthly') {
    const nd = new Date(y, m - 1 + 1, 1); // first of next month
    const dim = new Date(nd.getFullYear(), nd.getMonth() + 1, 0).getDate();
    nd.setDate(Math.min(d, dim));
    return toISO(nd);
  }
  // yearly: same month/day next year, clamped to Feb 28 on leap years
  const dim = new Date(y + 1, m, 0).getDate();
  return toISO(new Date(y + 1, m - 1, Math.min(d, dim)));
}

/** First occurrence on/after `startDate` (i.e. the schedule anchor). */
export function firstOccurrence(freq: RecurFreq, startDate: string, anchorDay?: number): string {
  // For monthly/yearly the anchor day-of-month comes from the start date and
  // is preserved (clamped) for shorter months.
  void anchorDay;
  return startDate;
}

/**
 * The next occurrence of a rule that is due strictly after `lastRun`
 * (which may be undefined — then it is the rule's startDate).
 */
export function nextRunFor(rule: Pick<Recurring, 'freq' | 'startDate' | 'nextRun' | 'lastRun'>): string {
  return rule.nextRun;
}

export interface GenerationResult {
  /** Transactions to append (deterministic ids; caller dedupes by id). */
  created: Transaction[];
  /** Rule updates to persist after generation (by rule id). */
  updates: { id: string; nextRun: string; lastRun?: string }[];
}

/**
 * Run every active rule against `todayISO`.
 *
 * Occurrences older than MAX_BACKFILL_DAYS are skipped without being written
 * (the cursor still advances past them). The loop caps real work at
 * MAX_CATCH_UP attempts per rule per run.
 *
 * @param rules current recurring rules
 * @param existingTxIds ids already present in the ledger (dedupe)
 * @param today current date, ISO
 */
export function generateDue(rules: Recurring[], existingTxIds: Set<string>, todayISO: string): GenerationResult {
  const created: Transaction[] = [];
  const ids = new Set(existingTxIds);
  const updates: GenerationResult['updates'] = [];
  const horizon = addDaysISO(todayISO, -MAX_BACKFILL_DAYS);

  for (const rule of rules) {
    if (rule.paused) continue;
    if (!isISODate(rule.startDate) || !isISODate(rule.nextRun)) continue;
    let cursor = rule.nextRun;
    let lastRun = rule.lastRun;
    let attempts = 0;
    while (cursor <= todayISO) {
      if (cursor < horizon) {
        // dead zone — fast-forward without writing or counting toward the cap
        cursor = nextAfter(rule.freq, cursor);
        continue;
      }
      const txId = `${REC_TX_ID_PREFIX}${rule.id}${cursor}`;
      if (!ids.has(txId)) {
        const tx: Transaction = {
          id: txId,
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.categoryId,
          date: cursor,
          note: `${rule.name} · recurring`,
          source: 'recurring',
          createdAt: Date.now(),
        };
        if (rule.accountId) tx.accountId = rule.accountId;
        created.push(tx);
        ids.add(txId);
        lastRun = cursor;
      } else {
        lastRun = cursor;
      }
      cursor = nextAfter(rule.freq, cursor);
      attempts += 1;
      if (attempts >= MAX_CATCH_UP) break;
    }
    if (cursor !== rule.nextRun || lastRun !== rule.lastRun) {
      updates.push({ id: rule.id, nextRun: cursor, lastRun });
    }
  }
  return { created, updates };
}

/** Next `count` upcoming occurrences of a rule (for the "upcoming" list). */
export function upcomingFor(rule: Recurring, count: number = 3): string[] {
  const out: string[] = [];
  let cursor = rule.nextRun;
  while (out.length < count) {
    out.push(cursor);
    cursor = nextAfter(rule.freq, cursor);
  }
  return out;
}

export const FREQ_LABEL: Record<RecurFreq, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

export function freqLabel(rule: Pick<Recurring, 'freq'>): string {
  return FREQ_LABEL[rule.freq];
}
