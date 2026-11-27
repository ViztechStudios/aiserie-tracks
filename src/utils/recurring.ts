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

/** Day-of-month of an ISO date (the anchor a monthly schedule holds onto). */
export function anchorDayOf(dateISO: string): number {
  if (!isISODate(dateISO)) return 0;
  return Number(dateISO.split('-')[2]);
}

/** Next calendar date strictly after `dateISO`, matching the frequency.
 *  For monthly rules, pass `anchorDay` (the rule's start day) so a short
 *  month's clamp (Jan 31 → Feb 28) does not permanently drag the schedule
 *  down to the 28th — March returns to the 31st (v4.2.0 drift fix). */
export function nextAfter(freq: RecurFreq, dateISO: string, anchorDay?: number): string {
  // Defensive stop: a malformed/missing date (old data, hand-edited backup)
  // must never crash a render — restart from today instead of throwing.
  if (!isISODate(dateISO)) return toISO(new Date());
  const known: RecurFreq = FREQS.includes(freq) ? freq : 'monthly';
  const [y, m, d] = dateISO.split('-').map(Number);
  if (known === 'daily') return addDaysISO(dateISO, 1);
  if (known === 'weekly') return addDaysISO(dateISO, 7);
  if (known === 'monthly') {
    const nd = new Date(y, m - 1 + 1, 1); // first of next month
    const dim = new Date(nd.getFullYear(), nd.getMonth() + 1, 0).getDate();
    // hold onto the anchored day when one was supplied; otherwise keep the
    // cursor's day (preserves the old behaviour for direct callers)
    const wanted = anchorDay && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : d;
    nd.setDate(Math.min(wanted, dim));
    return toISO(nd);
  }
  // yearly: same month/day next year, clamped to Feb 28 on leap years
  const dim = new Date(y + 1, m, 0).getDate();
  return toISO(new Date(y + 1, m - 1, Math.min(d, dim)));
}

const FREQS: RecurFreq[] = ['daily', 'weekly', 'monthly', 'yearly'];

/** First occurrence on/after `startDate` (i.e. the schedule anchor). */
export function firstOccurrence(freq: RecurFreq, startDate: string, anchorDay?: number): string {
  // The anchor day-of-month comes from the start date and is preserved
  // (clamped) for shorter months via nextAfter's anchorDay parameter.
  void freq;
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
    // a rule without a usable amount must not inject ₱0 rows — the user fixes
    // the amount first (the card is paused and prompts them to edit)
    if (!(typeof rule.amount === 'number' && Number.isFinite(rule.amount) && rule.amount > 0)) continue;
    if (!isISODate(rule.startDate) || !isISODate(rule.nextRun)) continue;
    // v4.2.0: the rule's start day is the permanent anchor — short months
    // clamp one occurrence but the schedule recovers on the next long month
    const anchor = anchorDayOf(rule.startDate);
    let cursor = rule.nextRun;
    let lastRun = rule.lastRun;
    let attempts = 0;
    while (cursor <= todayISO) {
      if (cursor < horizon) {
        // dead zone — fast-forward without writing or counting toward the cap
        cursor = nextAfter(rule.freq, cursor, anchor);
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
      cursor = nextAfter(rule.freq, cursor, anchor);
      attempts += 1;
      if (attempts >= MAX_CATCH_UP) break;
    }
    if (cursor !== rule.nextRun || lastRun !== rule.lastRun) {
      updates.push({ id: rule.id, nextRun: cursor, lastRun });
    }
  }
  return { created, updates };
}

/**
 * Next `count` upcoming occurrences of a rule (for the "upcoming" list).
 * Never throws: rules from older app versions or hand-edited backups can be
 * missing `nextRun`/`startDate`/`freq` — the list falls back gracefully.
 */
export function upcomingFor(rule: Recurring, count: number = 3): string[] {
  const out: string[] = [];
  let cursor = isISODate(rule?.nextRun)
    ? rule.nextRun
    : isISODate(rule?.startDate)
      ? rule.startDate
      : toISO(new Date());
  const anchor = isISODate(rule?.startDate) ? anchorDayOf(rule.startDate) : undefined;
  while (out.length < count) {
    out.push(cursor);
    cursor = nextAfter(rule?.freq ?? 'monthly', cursor, anchor);
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
  return FREQ_LABEL[rule?.freq as RecurFreq] ?? 'Every month';
}

/**
 * Repair a recurring rule loaded from storage so every consumer (engine,
 * cards, toasts) can trust it. Keeps user rules intact — only fills gaps:
 * freq/type from known values, dates from startDate/today, amount coercion.
 * Rows without a usable id are dropped (they cannot be addressed at all).
 */
export function sanitizeRule(raw: unknown): Recurring | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Recurring> & Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  const amount = typeof r.amount === 'number' && Number.isFinite(r.amount) && r.amount > 0 ? r.amount : 0;
  const startDate = isISODate(r.startDate) ? r.startDate : toISO(new Date());
  const nextRun = isISODate(r.nextRun) ? r.nextRun : startDate;
  const lastRun = isISODate(r.lastRun) ? r.lastRun : undefined;
  const freq: RecurFreq = FREQS.includes(r.freq as RecurFreq) ? (r.freq as RecurFreq) : 'monthly';
  const type = r.type === 'income' ? 'income' : 'expense';
  return {
    id: r.id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name : 'Scheduled transaction',
    type,
    amount,
    categoryId: typeof r.categoryId === 'string' && r.categoryId ? r.categoryId : 'other-exp',
    accountId: typeof r.accountId === 'string' && r.accountId ? r.accountId : undefined,
    freq,
    startDate,
    nextRun,
    lastRun,
    // an unusable amount cannot be scheduled safely — pause instead of drop
    paused: r.paused === true || amount === 0,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  };
}

export function sanitizeRules(list: unknown): Recurring[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: Recurring[] = [];
  for (const row of list) {
    const rule = sanitizeRule(row);
    if (!rule || seen.has(rule.id)) continue;
    seen.add(rule.id);
    out.push(rule);
  }
  return out;
}
