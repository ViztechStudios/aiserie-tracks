/**
 * Aiserie Tracks — reliability test suite (pure logic, no UI).
 * Run with: npm test   (tsx tests/run.ts)
 *
 * Covers the arithmetic the ledger depends on: wallet balances with
 * transfers, monthly totals, category breakdowns, recurring scheduling and
 * idempotent generation, backup validation/sanitation, and budget alert
 * thresholds. Every failure prints and exits non-zero.
 */
import assert from 'node:assert/strict';

import { Account, Budget, Recurring, Transaction } from '../src/types';
import { accountBalance, accountNet } from '../src/utils/accounts';
import { categoryTotals, totalsForMonth, lastMonths } from '../src/utils/stats';
import { formatMoney, parseAmount, parseAmountSigned } from '../src/utils/money';
import { generateDue, nextAfter, upcomingFor, sanitizeRules, REC_TX_ID_PREFIX } from '../src/utils/recurring';
import { buildBackup, validateBackup, planRestore, BACKUP_SCHEMA, backupFileName, findDuplicateRecurringSignatures } from '../src/services/backup';
import { buildReportCSV, buildReportHTML, inRange, rangeThisMonth } from '../src/services/report';
import { activeLevels, crossingLevel, alertMessage, alertKey } from '../src/utils/budgetAlerts';
import { Goal } from '../src/types';
import { goalProgress, goalRemaining, applyGoalChange, completesGoal } from '../src/utils/goals';
import { hashPin, hashPinV1, makeSalt, isPinAcceptable, verifyPin, LockConfig, LockGuard, recordFailedAttempt, guardRemainingMs } from '../src/utils/pinlock';
import { compactData, byteSize, formatBytes } from '../src/store/storage';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e: any) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${e?.message ?? e}`);
  }
}

/* ------------------------------ fixtures ----------------------------- */

const acct = (id: string, opening = 0): Account => ({
  id,
  name: id,
  type: 'cash',
  emoji: '💵',
  color: '#0EA5E9',
  openingBalance: opening,
  updatedAt: 0,
});

const tx = (over: Partial<Transaction> & { amount: number; type: Transaction['type'] }): Transaction => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  categoryId: over.categoryId ?? 'food',
  date: over.date ?? '2026-11-15',
  source: 'manual',
  createdAt: 0,
  ...over,
} as Transaction);

const rule = (over: Partial<Recurring> & { id: string }): Recurring => ({
  name: 'Test rule',
  type: 'expense',
  amount: 100,
  categoryId: 'food',
  freq: 'monthly',
  startDate: '2026-01-15',
  nextRun: '2026-01-15',
  paused: false,
  createdAt: 0,
  ...over,
});

/* ------------------------------- money ------------------------------- */

console.log('money formatting & parsing');
test('parseAmount handles commas, spaces and junk', () => {
  assert.equal(parseAmount('1,250.50'), 1250.5);
  assert.equal(parseAmount(' 1250 '), 1250);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('0'), null);
  // v4.2.0: negatives no longer flip into positives — parseAmount rejects them
  // (the old behavior silently saved +500 for a "-500" wallet reconciliation,
  // doubling the error); use parseAmountSigned where a sign is meaningful
  assert.equal(parseAmount('-5'), null);
  assert.equal(parseAmountSigned('-5'), -5);
  assert.equal(parseAmountSigned('(500)'), -500);
});

test('parseAmountSigned keeps the sign and separator intent', () => {
  assert.equal(parseAmountSigned('-1,250.50'), -1250.5);
  assert.equal(parseAmountSigned('1.250,50'), 1250.5, 'European decimal: last separator wins');
  assert.equal(parseAmountSigned('1,250.50'), 1250.5);
  assert.equal(parseAmountSigned('1.250.000'), 1250000, 'repeated dots are grouping');
  assert.equal(parseAmountSigned('1.250'), 1.25, 'Filipino convention: one dot is always decimal');
  assert.equal(parseAmountSigned('1,5'), 1.5, 'single comma with short tail is decimal');
  assert.equal(parseAmountSigned('1,250'), 1250, 'comma with 3-digit tail is grouping');
  assert.equal(parseAmountSigned('12 500'), 12500, 'spaces vanish');
  assert.equal(parseAmountSigned(''), null);
});
test('formatMoney renders the currency and thousands separator', () => {
  const out = formatMoney(1234.5, 'PHP');
  assert.equal(out.includes('1,234.50'), true);
  assert.equal(out.includes('PHP') || out.includes('₱'), true);
});

/* ---------------------------- balances ------------------------------- */

console.log('wallet balances (incl. transfers)');
test('income adds, expense subtracts on the linked wallet', () => {
  const a = acct('w1', 1000);
  const txs = [tx({ type: 'income', amount: 500, accountId: 'w1' }), tx({ type: 'expense', amount: 200, accountId: 'w1' })];
  assert.equal(accountBalance(a, txs), 1300);
});
test('transfer moves money between wallets and never creates or destroys it', () => {
  const a = acct('w1', 1000);
  const b = acct('w2', 0);
  const txs = [tx({ type: 'transfer', amount: 400, accountId: 'w1', toAccountId: 'w2' })];
  assert.equal(accountBalance(a, txs), 600);
  assert.equal(accountBalance(b, txs), 400);
  assert.equal(accountBalance(a, txs) + accountBalance(b, txs), 1000, 'conservation of money');
});
test('accountNet ignores other wallets entirely', () => {
  const txs = [tx({ type: 'expense', amount: 50, accountId: 'w9' })];
  assert.equal(accountNet('w1', txs), 0);
});
test('balances survive half-cent amounts via rounding', () => {
  const a = acct('w1', 0);
  const txs = [tx({ type: 'income', amount: 0.1, accountId: 'w1' }), tx({ type: 'income', amount: 0.2, accountId: 'w1' })];
  assert.equal(accountBalance(a, txs), 0.3);
});

/* ------------------------ monthly aggregates -------------------------- */

console.log('monthly totals & category breakdowns');
test('totalsForMonth splits income/expense and excludes transfers', () => {
  const txs = [
    tx({ type: 'income', amount: 1000, date: '2026-11-01' }),
    tx({ type: 'expense', amount: 300, date: '2026-11-02' }),
    tx({ type: 'transfer', amount: 700, date: '2026-11-03' }),
    tx({ type: 'expense', amount: 999, date: '2026-10-02' }),
  ];
  const totals = totalsForMonth(txs, '2026-11');
  assert.deepEqual(totals, { income: 1000, expense: 300, net: 700 });
});
test('categoryTotals only counts the requested type in that month', () => {
  const txs = [
    tx({ type: 'expense', amount: 100, categoryId: 'food', date: '2026-11-05' }),
    tx({ type: 'expense', amount: 50, categoryId: 'food', date: '2026-11-06' }),
    tx({ type: 'income', amount: 500, categoryId: 'salary', date: '2026-11-07' }),
  ];
  const expenses = categoryTotals(txs, '2026-11', 'expense');
  assert.equal(expenses.length, 1);
  assert.equal(expenses[0].amount, 150);
});
test('lastMonths produces a stable, ordered window', () => {
  const bars = lastMonths([tx({ type: 'expense', amount: 10, date: '2026-11-01' })], 3, '2026-11');
  assert.deepEqual(bars.map((b) => b.ym), ['2026-09', '2026-10', '2026-11']);
  assert.equal(bars[2].expense, 10);
  assert.equal(bars[0].expense, 0);
});

/* --------------------------- recurring -------------------------------- */

console.log('recurring schedules & idempotent generation');
test('nextAfter advances daily / weekly / monthly / yearly correctly', () => {
  assert.equal(nextAfter('daily', '2026-11-30'), '2026-12-01');
  assert.equal(nextAfter('weekly', '2026-01-07'), '2026-01-14');
  assert.equal(nextAfter('monthly', '2026-01-31'), '2026-02-28', 'month-end clamp');
  assert.equal(nextAfter('yearly', '2024-02-29'), '2025-02-28', 'leap-year clamp');
});
test('generation creates exactly one transaction per due occurrence', () => {
  const r = rule({ id: 'r1', freq: 'monthly', startDate: '2026-01-15', nextRun: '2026-01-15' });
  const res = generateDue([r], new Set(), '2026-03-20');
  assert.equal(res.created.length, 3, 'Jan 15, Feb 15, Mar 15');
  assert.deepEqual(res.created.map((c) => c.date), ['2026-01-15', '2026-02-15', '2026-03-15']);
  assert.equal(res.updates.length, 1);
  assert.equal(res.updates[0].nextRun, '2026-04-15');
});
test('re-running the engine never duplicates (deterministic ids)', () => {
  const r = rule({ id: 'r1', freq: 'daily', startDate: '2026-11-01', nextRun: '2026-11-01' });
  const first = generateDue([r], new Set(), '2026-11-03');
  const ids = new Set(first.created.map((c) => c.id));
  const second = generateDue([r], ids, '2026-11-03');
  assert.equal(second.created.length, 0, 'all already recorded');
  assert.equal([...ids][0].startsWith(REC_TX_ID_PREFIX), true);
});
test('catch-up skips ancient occurrences instead of flooding the ledger', () => {
  const r = rule({ id: 'r2', freq: 'daily', startDate: '2020-01-01', nextRun: '2020-01-01' });
  const res = generateDue([r], new Set(), '2026-11-26');
  assert.equal(res.created.length <= 400, true, 'capped at MAX_CATCH_UP');
  const update = res.updates[0];
  assert.ok(update && update.nextRun > '2026-11-26', 'nextRun moves past today');
  assert.ok(res.created.every((c) => c.date >= '2026-08-28'), 'nothing written older than the 90-day backfill horizon');
});
test('paused rules generate nothing', () => {
  const r = rule({ id: 'r3', nextRun: '2026-01-01', paused: true });
  const res = generateDue([r], new Set(), '2026-12-01');
  assert.equal(res.created.length, 0);
  assert.equal(res.updates.length, 0);
});
test('income rules carry the income type into the ledger', () => {
  const r = rule({ id: 'r4', type: 'income', freq: 'monthly', startDate: '2026-05-28', nextRun: '2026-05-28' });
  const res = generateDue([r], new Set(), '2026-06-30');
  assert.equal(res.created.length, 2);
  assert.equal(res.created.every((c) => c.type === 'income'), true);
  assert.equal(res.created.every((c) => c.source === 'recurring'), true);
});
test('upcomingFor lists the next occurrences in order', () => {
  const r = rule({ id: 'r5', freq: 'weekly', startDate: '2026-11-02', nextRun: '2026-11-02' });
  assert.deepEqual(upcomingFor(r, 3), ['2026-11-02', '2026-11-09', '2026-11-16']);
});

/* ---------------------------- budget alerts --------------------------- */

console.log('budget alert thresholds');
const budget = (cap: number, alerts?: number[]): Budget => ({ id: 'b1', categoryId: 'food', cap, createdAt: 0, alerts });
test('each threshold fires exactly once, in order', () => {
  const state: Record<string, number> = {};
  const b = budget(1000);
  const fire = (spent: number) => {
    const hit = crossingLevel(b, spent, '2026-11', state);
    if (hit) state[alertKey('b1', '2026-11')] = Math.max(state[alertKey('b1', '2026-11')] ?? 0, hit.level);
    return hit?.level ?? null;
  };
  assert.equal(fire(400), null, '40% has not reached the first threshold');
  assert.equal(fire(500), 0.5);
  assert.equal(fire(550), null, '50% already announced');
  assert.equal(fire(800), 0.75);
  assert.equal(fire(900), 0.9);
  assert.equal(fire(950), null);
  assert.equal(fire(1000), 1);
  assert.equal(fire(1200), null, 'nothing past 100%');
});
test('a fresh month re-arms every level', () => {
  const state: Record<string, number> = { 'b1:2026-11': 1 };
  assert.equal(crossingLevel(budget(1000), 600, '2026-12', state)?.level, 0.5);
});
test('trimmed alert sets are respected', () => {
  const b = budget(1000, [0.9]);
  assert.equal(crossingLevel(b, 500, '2026-11', {})?.level ?? null, null, '50% not configured');
  assert.equal(crossingLevel(b, 950, '2026-11', {})?.level, 0.9);
});
test('zero/invalid caps and spends never fire', () => {
  assert.equal(crossingLevel(budget(0), 100, '2026-11', {}), null);
  assert.equal(crossingLevel(budget(1000), 0, '2026-11', {}), null);
});
test('activeLevels falls back to defaults and clamps junk', () => {
  assert.deepEqual(activeLevels(budget(1)), [0.5, 0.75, 0.9, 1]);
  assert.deepEqual(activeLevels(budget(1, [0.5])), [0.5]);
  assert.deepEqual(activeLevels(budget(1, [2, -1, 0.75])), [0.75]);
});
test('alertMessage speaks pesos, not percentages, at 100%', () => {
  const msg = alertMessage({ level: 1, spent: 1000, cap: 1000, ym: '2026-11' }, 'Food', (n) => `₱${n}`);
  assert.equal(msg.includes('used up'), true);
  const msg2 = alertMessage({ level: 0.5, spent: 500, cap: 1000, ym: '2026-11' }, 'Food', (n) => `₱${n}`);
  assert.equal(msg2.includes('50%'), true);
  assert.equal(msg2.includes('₱500 left'), true);
});

/* ------------------------------- backup ------------------------------- */

console.log('backup build, validation & restore planning');
const sampleTx = tx({ id: 't1', type: 'expense', amount: 120.5, date: '2026-11-01', note: 'groceries' });
test('buildBackup embeds schema, counts and every section', () => {
  const b = buildBackup(
    {
      transactions: [sampleTx],
      accounts: [acct('w1', 500)],
      settings: { currency: 'PHP', userName: 'Aiserie' },
      tasks: [],
      budgets: [budget(1000)],
      bills: [],
      recurring: [rule({ id: 'r1' })],
      budgetAlerts: {},
      goals: [{ id: 'g1', name: 'Trip', emoji: '🐷', target: 5000, saved: 2000, createdAt: 0 }],
    },
    '3.0.0'
  );
  assert.equal(b.schema, BACKUP_SCHEMA);
  assert.equal(b.counts?.transactions, 1);
  assert.equal(b.data.budgets.length, 1);
  assert.equal(b.data.goals.length, 1);
  const v = validateBackup(JSON.stringify(b));
  assert.equal(v.ok, true);
  assert.equal(v.counts?.transactions, 1);
  assert.equal(v.counts?.goals, 1);
  assert.equal(v.data?.goals[0].saved, 2000);
  // goals with junk targets or names are dropped on import
  const dirty = JSON.parse(JSON.stringify(b));
  dirty.data.goals.push({ id: 'g2', name: '', emoji: '🐷', target: 100, saved: 0, createdAt: 0 });
  dirty.data.goals.push({ id: 'g3', name: 'Zero', emoji: '🐷', target: 0, saved: 0, createdAt: 0 });
  const v2 = validateBackup(JSON.stringify(dirty));
  assert.equal(v2.counts?.goals, 1);
});

test('validateBackup preserves the privacy-shield preference (v4.2.0 restore fidelity)', () => {
  const b = buildBackup(
    {
      transactions: [],
      accounts: [acct('w1', 500)],
      settings: { currency: 'EUR', userName: 'Aiserie', privacyShield: false },
      tasks: [],
      budgets: [],
      bills: [],
      recurring: [],
      budgetAlerts: {},
      goals: [],
    },
    '4.2.0'
  );
  const v = validateBackup(JSON.stringify(b));
  assert.equal(v.ok, true);
  assert.equal(v.data?.settings?.currency, 'EUR');
  assert.equal(v.data?.settings?.privacyShield, false);
  // a file without the field leaves it undefined — the app keeps its default
  const legacy = JSON.parse(JSON.stringify(b));
  delete legacy.data.settings.privacyShield;
  const v2 = validateBackup(JSON.stringify(legacy));
  assert.equal(v2.data?.settings?.privacyShield, undefined);
});

test('monthly recurring rules recover their anchor day after a short month', () => {
  // the v4.1.0 drift: Jan 31 → Feb 28 → Mar 28 → Apr 28 … forever
  assert.equal(nextAfter('monthly', '2026-01-31', 31), '2026-02-28', 'clamped in the short month');
  assert.equal(nextAfter('monthly', '2026-02-28', 31), '2026-03-31', 'anchor recovers on the long month');
  assert.equal(nextAfter('monthly', '2026-02-28'), '2026-03-28', 'without an anchor the old behavior is preserved');
  // upcoming list carries the anchor from startDate
  const anchoredRule = rule({ id: 'anchor1', freq: 'monthly', startDate: '2026-01-31', nextRun: '2026-02-28' });
  const upcoming = upcomingFor(anchoredRule, 2);
  assert.equal(upcoming[0], '2026-02-28');
  assert.equal(upcoming[1], '2026-03-31');
});

test('merge warns about recurring rules that already exist by signature', () => {
  const salary = rule({ id: 'from-device-a', name: 'Salary', amount: 26000, freq: 'monthly' });
  const rent = rule({ id: 'from-device-b', name: 'Rent', amount: 12000, freq: 'monthly' });
  const existing = [rule({ id: 'from-device-b2', name: 'Salary', amount: 26000, freq: 'monthly' })];
  const dupes = findDuplicateRecurringSignatures([salary, rent], existing);
  assert.equal(dupes.length, 1);
  assert.equal(dupes[0].name, 'Salary');
  assert.equal(findDuplicateRecurringSignatures([rent], existing).length, 0);
});

test('backup filenames never collide within the same minute', () => {
  const now = new Date(2026, 10, 27, 12, 30, 15);
  const names = new Set([backupFileName(now), backupFileName(now), backupFileName(now)]);
  assert.equal(names.size, 3);
  assert.ok(backupFileName(now).startsWith('aiserie-backup-20261127-123015-'));
});

test('planRestore reports true net-new transaction counts for merge', () => {
  const a = { ...sampleTx, id: 'tx-a' };
  const b = { ...sampleTx, id: 'tx-b' };
  const plan = planRestore({ transactions: [a, b], accounts: [], settings: null, tasks: [], budgets: [], bills: [], recurring: [], budgetAlerts: {}, goals: [] }, new Set(['tx-a']), 'merge');
  assert.equal(plan.fresh.transactions, 1);
});
test('validateBackup rejects non-JSON, foreign schemas and empty payloads', () => {
  assert.equal(validateBackup('not json{').ok, false);
  assert.equal(validateBackup(JSON.stringify({ schema: 'other-app-9', data: {} })).ok, false);
  assert.equal(validateBackup(JSON.stringify({ schema: BACKUP_SCHEMA, data: {} })).ok, false);
});
test('validateBackup drops corrupt entries but keeps the readable ones', () => {
  const b = {
    schema: BACKUP_SCHEMA,
    data: {
      transactions: [
        sampleTx,
        { id: 'bad', type: 'expense', amount: -5, date: 'nope' },
        { id: 'bad2', type: 'party', amount: 10, date: '2026-11-01' },
        { id: 'dup', type: 'income', amount: 1, date: '2026-11-02' },
        { id: 'dup', type: 'income', amount: 2, date: '2026-11-02' },
      ],
      accounts: [{ id: 'w1', name: '', type: 'bank', emoji: '🏦', color: '#000000', openingBalance: '12.5', updatedAt: 1 }],
      settings: { currency: 'php', userName: '  ' },
    },
  };
  const v = validateBackup(JSON.stringify(b));
  assert.equal(v.ok, true);
  assert.equal(v.data?.transactions.length, 2, 'invalid and duplicate entries removed');
  assert.equal(v.data?.accounts.length, 0, 'wallet without a name is dropped');
  assert.equal(v.data?.settings?.currency, 'PHP');
  assert.equal(v.data?.settings?.userName, 'Aiserie', 'blank name falls back to default');
});
test('planRestore counts only genuinely new transactions in merge mode', () => {
  const v = validateBackup(
    JSON.stringify({ schema: BACKUP_SCHEMA, data: { transactions: [sampleTx, tx({ id: 't2', amount: 5, type: 'expense' })] } })
  );
  assert.equal(v.ok, true);
  const plan = planRestore(v.data!, new Set(['t1']), 'merge');
  assert.equal(plan.fresh.transactions, 1);
});

/* ------------------------------- reports ------------------------------ */

console.log('report ranges, CSV & PDF payloads');
test('inRange bounds are inclusive on both ends', () => {
  const r = { from: '2026-11-01', to: '2026-11-30', label: 'x' };
  assert.equal(inRange(tx({ date: '2026-11-01', amount: 1, type: 'expense' }), r), true);
  assert.equal(inRange(tx({ date: '2026-11-30', amount: 1, type: 'expense' }), r), true);
  assert.equal(inRange(tx({ date: '2026-12-01', amount: 1, type: 'expense' }), r), false);
});
test('CSV escapes commas, quotes and newlines safely', () => {
  const csv = buildReportCSV(
    [tx({ note: 'said "hi", then left', amount: 10, type: 'expense', accountId: 'w1' })],
    [acct('w1', 0)],
    rangeThisMonth(new Date('2026-11-15T10:00:00')),
    'PHP'
  );
  assert.equal(csv.includes('"said ""hi"", then left"'), true);
  const rows = csv.split('\r\n');
  assert.equal(rows[0].includes('Aiserie Tracks report'), true);
  assert.equal(rows.some((r2) => r2.startsWith('"Date","Type","Category"')), true);
});
test('HTML report carries the brand, totals and on-device note', () => {
  const html = buildReportHTML(
    [tx({ amount: 250, type: 'expense', date: '2026-11-02' }), tx({ amount: 1000, type: 'income', date: '2026-11-01' })],
    [acct('w1', 500)],
    { from: '2026-11-01', to: '2026-11-30', label: 'This month' },
    'PHP',
    'Aiserie'
  );
  assert.equal(html.includes('Aiserie Tracks — Financial Report'), true);
  assert.equal(html.includes('₱1,000.00'), true);
  assert.equal(html.includes('Generated on-device'), true);
});

/* --------------------------- savings goals ---------------------------- */

test('goal progress clamps to 0..100%', () => {
  const goal: Goal = { id: 'g1', name: 'Trip', emoji: '🐷', target: 5000, saved: 2500, createdAt: 0 };
  assert.equal(goalProgress(goal), 0.5);
  assert.equal(goalProgress({ ...goal, saved: 9999 }), 1);
  assert.equal(goalProgress({ ...goal, saved: -100 }), 0);
  assert.equal(goalProgress({ ...goal, target: 0 }), 0);
  assert.equal(goalRemaining({ ...goal, saved: 6000 }), 0);
});

test('contributions cap at target, withdrawals floor at zero', () => {
  const goal: Goal = { id: 'g1', name: 'Trip', emoji: '🐷', target: 1000, saved: 900, createdAt: 0 };
  assert.equal(applyGoalChange(goal, 250), 1000);
  assert.equal(applyGoalChange(goal, 50), 950);
  assert.equal(applyGoalChange(goal, -2000), 0);
  assert.equal(applyGoalChange(goal, 0), 900);
  assert.equal(applyGoalChange(goal, NaN), 900);
  assert.equal(completesGoal(goal, 100), true);
  assert.equal(completesGoal({ ...goal, saved: 1000 }, 100), false); // already complete
  assert.equal(completesGoal(goal, -100), false);
});

/* ------------------------------ pin lock ------------------------------ */

test('pin hashing is salted, deterministic and never reversible', () => {
  const salt = makeSalt();
  const h1 = hashPin('1234', salt);
  const h2 = hashPin('1234', salt);
  const h3 = hashPin('4321', salt);
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.equal(h1.length, 64);
  assert.equal(h1.includes(salt), false);
  const cfg: LockConfig = { enabled: true, salt, hash: h1, kdf: 2 };
  assert.deepEqual(verifyPin('1234', cfg), { ok: true, upgrade: false });
  assert.deepEqual(verifyPin('9999', cfg), { ok: false, upgrade: false });
});

test('legacy v4.0 pin hashes still verify and offer a stretch upgrade', () => {
  const salt = makeSalt();
  const legacy = hashPinV1('2468', salt);
  const cfg: LockConfig = { enabled: true, salt, hash: legacy }; // no kdf field
  const verdict = verifyPin('2468', cfg);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.upgrade, true);
  assert.equal(verifyPin('1111', cfg).ok, false);
  // after upgrade the stretched hash verifies too
  const upgraded: LockConfig = { enabled: true, salt: cfg.salt, hash: hashPin('2468', cfg.salt), kdf: 2 };
  assert.equal(verifyPin('2468', upgraded).ok, true);
});

test('failed pin attempts earn an escalating persisted lockout', () => {
  let guard: LockGuard | null = null;
  assert.equal(guardRemainingMs(guard, 1000), 0);
  guard = recordFailedAttempt(guard, 1000);
  guard = recordFailedAttempt(guard, 2000);
  assert.equal(guardRemainingMs(guard, 3000), 0); // first two typos stay open
  guard = recordFailedAttempt(guard, 3000);
  assert.equal(guard.lockedUntil, 3000 + 30_000); // 3rd → 30s
  guard = recordFailedAttempt(guard, 31000);
  assert.equal(guard.lockedUntil, 31000 + 60_000); // 4th → 60s
  guard = recordFailedAttempt(guard, 91000);
  assert.equal(guard.lockedUntil, 91000 + 120_000); // 5th → 120s
  for (let i = 0; i < 10; i++) guard = recordFailedAttempt(guard, 200000);
  assert.equal(guard.lockedUntil - 200000, 300_000); // capped at 5 min
  assert.equal(guardRemainingMs(guard, 200001), 299_999);
  assert.equal(guardRemainingMs(guard, 501000), 0); // window passed
});

test('pin policy rejects repeats and runs', () => {
  for (const bad of ['1111', '1234', '9876', '12', 'abcd', '']) assert.equal(isPinAcceptable(bad), false, bad);
  for (const good of ['1357', '2468', '9041', '5527']) assert.equal(isPinAcceptable(good), true, good);
});

/* --------------------------- storage care ----------------------------- */

test('storage compaction drops only broken rows and exact duplicates', () => {
  const rows = [
    { id: 'a', type: 'expense', amount: 100, date: '2026-11-01' },
    { id: 'a', type: 'expense', amount: 100, date: '2026-11-01' }, // duplicate id
    { id: 'b', type: 'income', amount: -5, date: '2026-11-02' }, // bad amount
    { id: 'c', type: 'transfer', amount: 50, date: '2026-11-03' }, // orphan transfer
    { id: 'd', type: 'expense', amount: 20, date: '20261103' }, // bad date
    { id: 'e', type: 'expense', amount: 20, date: '2026-11-05' }, // keep
  ];
  const result = compactData({ transactions: rows, tasks: [], budgetAlerts: {} });
  assert.deepEqual(result.transactions.map((r: any) => r.id), ['a', 'e']);
  assert.equal(result.transactionsChanged, true);
});

test('finished chores older than 45 days are pruned, open ones never', () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const tasks = [
    { id: '1', title: 'old done', done: true, doneAt: now - 50 * day, important: false, createdAt: now },
    { id: '2', title: 'recent done', done: true, doneAt: now - 10 * day, important: false, createdAt: now },
    { id: '3', title: 'open', done: false, important: false, createdAt: now },
  ];
  const result = compactData({ transactions: [], tasks, budgetAlerts: {} }, now);
  assert.deepEqual(result.tasks.map((r: any) => r.id), ['2', '3']);
});

test('byteSize and formatBytes speak honest file sizes', () => {
  assert.equal(byteSize(''), 0);
  assert.equal(byteSize('{}'), 2);
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(2048 * 1024), '2.0 MB');
  assert.equal(formatBytes(50), '50 B');
});

/* --------------------- crash-proof recurring rules -------------------- */

test('upcomingFor survives rules with missing dates (the v3.0.0 crash)', () => {
  const broken: any = { id: 'r9', name: 'Old rule', amount: 100, categoryId: 'bills', freq: 'monthly' };
  const nexts = upcomingFor(broken, 2); // used to throw: undefined.split()
  assert.equal(nexts.length, 2);
  for (const n of nexts) assert.match(n, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(nextAfter('monthly', undefined as any), /^\d{4}-\d{2}-\d{2}$/);
});

test('upcomingFor falls back to startDate when nextRun is missing', () => {
  const rule: any = { id: 'r2', name: 'Rent', amount: 1, categoryId: 'rent', freq: 'monthly', startDate: '2026-01-10' };
  const nexts = upcomingFor(rule, 1);
  assert.equal(nexts[0], '2026-01-10');
});

test('sanitizeRules repairs broken rules and drops unusable ones', () => {
  const repaired = sanitizeRules([
    { id: 'a', name: 'Salary', amount: 5000, categoryId: 'salary', startDate: '2026-06-01' }, // no nextRun, no freq, no type
    { id: 'b', name: 'Weird', amount: 0, categoryId: 'food', freq: 'weekly', startDate: '2026-06-02' }, // unusable amount
    { id: 'c', name: 'Dup', amount: 9, categoryId: 'food', freq: 'daily', startDate: '2026-06-03' },
    { id: 'c', name: 'Dup', amount: 9, categoryId: 'food', freq: 'daily', startDate: '2026-06-03' }, // duplicate
    'garbage', // non-object row
    { noId: true }, // cannot be addressed
  ]);
  assert.equal(repaired.length, 3);
  const a = repaired.find((r) => r.id === 'a')!;
  assert.equal(a.nextRun, '2026-06-01'); // filled from startDate
  assert.equal(a.freq, 'monthly'); // defaulted
  assert.equal(a.type, 'expense'); // defaulted
  assert.equal(repaired.find((r) => r.id === 'b')!.paused, true); // paused, not dropped
  assert.ok(repaired.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.nextRun)));
});

test('accountBalance treats a missing openingBalance as zero, never NaN', () => {
  const acc = { id: 'w', openingBalance: undefined as any } as any as Account;
  const bal = accountBalance(acc, []);
  assert.equal(Number.isFinite(bal), true);
  assert.equal(bal, 0);
});

/* ------------------------------ summary ------------------------------- */

console.log('');
console.log(`passed: ${passed}  failed: ${failed}`);
if (failed > 0) process.exit(1);
console.log('ALL TESTS PASSED');
