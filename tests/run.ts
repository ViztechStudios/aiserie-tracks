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
import { formatMoney, parseAmount } from '../src/utils/money';
import { generateDue, nextAfter, upcomingFor, REC_TX_ID_PREFIX } from '../src/utils/recurring';
import { buildBackup, validateBackup, planRestore, BACKUP_SCHEMA } from '../src/services/backup';
import { buildReportCSV, buildReportHTML, inRange, rangeThisMonth } from '../src/services/report';
import { activeLevels, crossingLevel, alertMessage, alertKey } from '../src/utils/budgetAlerts';

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
  assert.equal(parseAmount('-5'), 5, 'signs are stripped — the ledger only keeps positive amounts');
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
    },
    '2.7.0'
  );
  assert.equal(b.schema, BACKUP_SCHEMA);
  assert.equal(b.counts?.transactions, 1);
  assert.equal(b.data.budgets.length, 1);
  const v = validateBackup(JSON.stringify(b));
  assert.equal(v.ok, true);
  assert.equal(v.counts?.transactions, 1);
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

/* ------------------------------ summary ------------------------------- */

console.log('');
console.log(`passed: ${passed}  failed: ${failed}`);
if (failed > 0) process.exit(1);
console.log('ALL TESTS PASSED');
