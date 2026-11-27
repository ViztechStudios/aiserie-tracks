import { Account, Bill, Budget, Goal, Recurring, Settings, Task, Transaction } from '../types';
import { isISODate } from '../utils/recurring';
import { AlertState } from '../utils/budgetAlerts';

/**
 * Backup & restore — one JSON file with every record the app keeps, written
 * and read entirely on-device. Nothing is uploaded anywhere.
 */

export const BACKUP_SCHEMA = 'aiserie-backup-1';

export interface BackupFile {
  app: string;
  schema: string;
  version: string;
  exportedAt: string;
  counts?: Record<string, number>;
  data: BackupData;
}

export interface BackupData {
  transactions: Transaction[];
  accounts: Account[];
  settings: Settings | null;
  tasks: Task[];
  budgets: Budget[];
  bills: Bill[];
  recurring: Recurring[];
  budgetAlerts: AlertState;
  goals: Goal[];
}

export interface BackupInput {
  transactions: Transaction[];
  accounts: Account[];
  settings: Settings;
  tasks: Task[];
  budgets: Budget[];
  bills: Bill[];
  recurring: Recurring[];
  budgetAlerts: AlertState;
  goals: Goal[];
}

export interface Validation {
  ok: boolean;
  error?: string;
  data?: BackupData;
  counts?: Record<string, number>;
}

/* ------------------------------ build ------------------------------ */

export function buildBackup(input: BackupInput, appVersion: string): BackupFile {
  const data: BackupData = {
    transactions: input.transactions,
    accounts: input.accounts,
    settings: input.settings,
    tasks: input.tasks,
    budgets: input.budgets,
    bills: input.bills,
    recurring: input.recurring,
    budgetAlerts: input.budgetAlerts,
    goals: input.goals,
  };
  return {
    app: 'Aiserie Tracks',
    schema: BACKUP_SCHEMA,
    version: appVersion,
    exportedAt: new Date().toISOString(),
    counts: {
      transactions: data.transactions.length,
      accounts: data.accounts.length,
      tasks: data.tasks.length,
      budgets: data.budgets.length,
      bills: data.bills.length,
      recurring: data.recurring.length,
      goals: data.goals.length,
    },
    data,
  };
}

export function backupFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  // v4.2.0: seconds + a random tail — two exports in the same minute used to
  // collide on the same filename and silently overwrite each other on disk.
  const tail = Math.random().toString(36).slice(2, 6);
  return `aiserie-backup-${y}${m}${d}-${h}${mi}${sec}-${tail}.json`;
}

/* ---------------------------- validate ----------------------------- */

function sanitizeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function sanitizeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function safeArray<T>(v: unknown, mapItem: (raw: any) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const item = mapItem(raw);
    if (item && typeof (item as any).id === 'string' && (item as any).id) {
      if (seen.has((item as any).id)) continue; // dedupe inside the file itself
      seen.add((item as any).id);
      out.push(item);
    }
  }
  return out;
}

const TX_TYPES = new Set(['expense', 'income', 'transfer']);
const TX_SOURCES = new Set(['manual', 'scan', 'sample', 'detect', 'recurring']);
const FREQS = new Set(['daily', 'weekly', 'monthly', 'yearly']);

/**
 * Full structural validation + sanitation. Corrupt entries are dropped, not
 * fatal — the goal is that a restore never poisons the ledger.
 */
export function validateBackup(raw: string): Validation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'The file is not valid JSON — it may have been truncated or edited.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'The file does not look like an Aiserie Tracks backup.' };
  }
  const obj = parsed as Record<string, any>;
  if (obj.schema !== BACKUP_SCHEMA) {
    return {
      ok: false,
      error: `Unsupported backup format${typeof obj.schema === 'string' ? ` ("${obj.schema}")` : ''}. This app reads "${BACKUP_SCHEMA}" files.`,
    };
  }
  const d = obj.data && typeof obj.data === 'object' ? obj.data : {};
  if (!Array.isArray(d.transactions) && !Array.isArray(d.accounts)) {
    return { ok: false, error: 'The backup carries no transactions or wallets — nothing to restore.' };
  }

  const transactions = safeArray<Transaction>(d.transactions, (t) => {
    const type = sanitizeString(t.type);
    if (!TX_TYPES.has(type)) return null;
    const amount = sanitizeNumber(t.amount, -1);
    if (amount <= 0) return null;
    if (!isISODate(t.date)) return null;
    return {
      id: sanitizeString(t.id),
      type: type as Transaction['type'],
      amount: Math.round(amount * 100) / 100,
      categoryId: sanitizeString(t.categoryId, 'other'),
      date: t.date as string,
      note: typeof t.note === 'string' ? t.note : undefined,
      source: (TX_SOURCES.has(sanitizeString(t.source)) ? sanitizeString(t.source) : 'manual') as Transaction['source'],
      createdAt: sanitizeNumber(t.createdAt, Date.now()),
      accountId: typeof t.accountId === 'string' && t.accountId ? t.accountId : undefined,
      toAccountId: typeof t.toAccountId === 'string' && t.toAccountId ? t.toAccountId : undefined,
    };
  });

  const accounts = safeArray<Account>(d.accounts, (a) => {
    const name = sanitizeString(a.name).trim();
    if (!name) return null;
    return {
      id: sanitizeString(a.id),
      name: name.slice(0, 40),
      type: (['ewallet', 'bank', 'cash'].includes(sanitizeString(a.type)) ? a.type : 'cash') as Account['type'],
      emoji: sanitizeString(a.emoji, '💰').slice(0, 4),
      color: /^#[0-9a-fA-F]{6}$/.test(sanitizeString(a.color)) ? a.color : '#0EA5E9',
      logoId: typeof a.logoId === 'string' && a.logoId ? a.logoId : undefined,
      openingBalance: Math.round(sanitizeNumber(a.openingBalance, 0) * 100) / 100,
      updatedAt: sanitizeNumber(a.updatedAt, Date.now()),
    };
  });

  const tasks = safeArray<Task>(d.tasks, (t) => {
    const title = sanitizeString(t.title).trim();
    if (!title) return null;
    return {
      id: sanitizeString(t.id),
      title: title.slice(0, 120),
      done: t.done === true,
      important: t.important === true,
      createdAt: sanitizeNumber(t.createdAt, Date.now()),
      doneAt: typeof t.doneAt === 'number' ? t.doneAt : undefined,
    };
  });

  const budgets = safeArray<Budget>(d.budgets, (b) => {
    const cap = sanitizeNumber(b.cap, -1);
    if (cap <= 0 || !sanitizeString(b.categoryId)) return null;
    return {
      id: sanitizeString(b.id),
      categoryId: sanitizeString(b.categoryId),
      cap: Math.round(cap * 100) / 100,
      createdAt: sanitizeNumber(b.createdAt, Date.now()),
      alerts: Array.isArray(b.alerts) ? b.alerts.filter((x: any) => typeof x === 'number' && x > 0 && x <= 1) : undefined,
    };
  });

  const bills = safeArray<Bill>(d.bills, (b) => {
    const amount = sanitizeNumber(b.amount, -1);
    const name = sanitizeString(b.name).trim();
    const dueDay = sanitizeNumber(b.dueDay, -1);
    if (amount <= 0 || !name || !(dueDay >= 1 && dueDay <= 31)) return null;
    return {
      id: sanitizeString(b.id),
      name: name.slice(0, 40),
      amount: Math.round(amount * 100) / 100,
      dueDay: Math.round(dueDay),
      emoji: typeof b.emoji === 'string' ? b.emoji.slice(0, 4) : undefined,
      accountId: typeof b.accountId === 'string' && b.accountId ? b.accountId : undefined,
      createdAt: sanitizeNumber(b.createdAt, Date.now()),
    };
  });

  const recurring = safeArray<Recurring>(d.recurring, (r) => {
    const amount = sanitizeNumber(r.amount, -1);
    const name = sanitizeString(r.name).trim();
    const type = sanitizeString(r.type);
    if (amount <= 0 || !name || !TX_TYPES.has(type) || !FREQS.has(sanitizeString(r.freq))) return null;
    if (!isISODate(r.startDate)) return null;
    const nextRun = isISODate(r.nextRun) ? (r.nextRun as string) : (r.startDate as string);
    return {
      id: sanitizeString(r.id),
      name: name.slice(0, 40),
      type: type === 'income' ? 'income' : 'expense',
      amount: Math.round(amount * 100) / 100,
      categoryId: sanitizeString(r.categoryId, 'other'),
      accountId: typeof r.accountId === 'string' && r.accountId ? r.accountId : undefined,
      freq: r.freq as Recurring['freq'],
      startDate: r.startDate as string,
      nextRun,
      lastRun: isISODate(r.lastRun) ? (r.lastRun as string) : undefined,
      paused: r.paused === true,
      createdAt: sanitizeNumber(r.createdAt, Date.now()),
    };
  });

  const goals = safeArray<Goal>(d.goals, (g) => {
    const name = sanitizeString(g.name).trim();
    const target = sanitizeNumber(g.target, -1);
    if (!name || target <= 0) return null;
    const saved = Math.max(sanitizeNumber(g.saved, 0), 0);
    return {
      id: sanitizeString(g.id),
      name: name.slice(0, 40),
      emoji: sanitizeString(g.emoji, '🐷').slice(0, 4),
      target: Math.round(target * 100) / 100,
      saved: Math.round(saved * 100) / 100,
      accountId: typeof g.accountId === 'string' && g.accountId ? g.accountId : undefined,
      createdAt: sanitizeNumber(g.createdAt, Date.now()),
      completedAt: typeof g.completedAt === 'number' ? g.completedAt : undefined,
      note: typeof g.note === 'string' ? g.note.slice(0, 120) : undefined,
    };
  });

  let budgetAlerts: AlertState = {};
  if (d.budgetAlerts && typeof d.budgetAlerts === 'object') {
    for (const [k, v] of Object.entries(d.budgetAlerts)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1.5) budgetAlerts[k] = v;
    }
  }

  let settings: Settings | null = null;
  if (d.settings && typeof d.settings === 'object') {
    const s = d.settings;
    settings = {
      currency: sanitizeString(s.currency, 'PHP').toUpperCase().slice(0, 3),
      userName: sanitizeString(s.userName, 'Aiserie').trim().slice(0, 24) || 'Aiserie',
      // v4.2.0: the privacy-shield preference travels with the file instead of
      // being silently dropped on restore (v4.1.0 exported it but never read it)
      privacyShield: typeof s.privacyShield === 'boolean' ? s.privacyShield : undefined,
    };
  }

  const counts = {
    transactions: transactions.length,
    accounts: accounts.length,
    tasks: tasks.length,
    budgets: budgets.length,
    bills: bills.length,
    recurring: recurring.length,
    goals: goals.length,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0 && !settings) {
    return { ok: false, error: 'The backup contains no readable records.' };
  }

  return {
    ok: true,
    data: { transactions, accounts, settings, tasks, budgets, bills, recurring, budgetAlerts, goals },
    counts,
  };
}

/* ------------------------------ apply ------------------------------ */

export interface RestorePlan {
  mode: 'merge' | 'replace';
  data: BackupData;
  /** How many records were NOT already on the device (informational). */
  fresh: Record<string, number>;
}

export function planRestore(data: BackupData, existingTxIds: Set<string>, mode: 'merge' | 'replace'): RestorePlan {
  const fresh = {
    transactions: data.transactions.filter((t) => !existingTxIds.has(t.id)).length,
    accounts: data.accounts.length,
    tasks: data.tasks.length,
    budgets: data.budgets.length,
    bills: data.bills.length,
    recurring: data.recurring.length,
    goals: data.goals.length,
  };
  return { mode, data, fresh };
}

/**
 * v4.2.0 — cross-device recurring-rule collision detector. Merge dedupes by
 * id only, but ids are random per device: the SAME rule ("Salary", monthly,
 * ₱26,000) created on two phones has different ids, and merging both makes
 * the engine double-generate its occurrences. Returns the incoming rules
 * whose (name + type + amount + frequency) signature already exists here.
 */
export function findDuplicateRecurringSignatures(
  incoming: Recurring[],
  existing: Recurring[]
): Recurring[] {
  const sig = (r: Recurring) => `${r.name.trim().toLowerCase()}|${r.type}|${r.amount.toFixed(2)}|${r.freq}`;
  const have = new Set(existing.map(sig));
  const seen = new Set<string>();
  return incoming.filter((r) => {
    const s = sig(r);
    if (have.has(s) && !seen.has(s)) {
      seen.add(s);
      return true;
    }
    return false;
  });
}
