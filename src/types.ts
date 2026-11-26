export type TxType = 'expense' | 'income' | 'transfer';

export type TxSource = 'manual' | 'scan' | 'sample' | 'detect' | 'recurring';

export type AccountType = 'ewallet' | 'bank' | 'cash';

export interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
  type: TxType;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  emoji: string;
  color: string;
  /** Optional brand tile (GCash, BPI, ...) from the built-in catalog. */
  logoId?: string;
  /** Balance the user declared when creating/reconciling the wallet. */
  openingBalance: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  type: TxType;
  /** Always a positive number. Direction comes from `type`. */
  amount: number;
  categoryId: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  note?: string;
  source: TxSource;
  createdAt: number;
  /** Optional wallet this transaction moved money in/out of. */
  accountId?: string;
  /** For transfers only: the wallet that receives the money. */
  toAccountId?: string;
}

/** Monthly cap for one spending category. */
export interface Budget {
  id: string;
  categoryId: string;
  /** Positive monthly cap. */
  cap: number;
  createdAt: number;
  /**
   * Spending thresholds (0..1) that fire a gentle in-app notice, e.g.
   * [0.5, 0.75, 0.9, 1]. Undefined keeps the full default set.
   */
  alerts?: number[];
}

/** A repeating bill the user wants reminded about. */
export interface Bill {
  id: string;
  name: string;
  amount: number;
  /** Day of month (1..31) the bill normally comes due. */
  dueDay: number;
  emoji?: string;
  accountId?: string;
  createdAt: number;
}

export type RecurFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * A scheduled transaction Aiserie generates automatically while the app is
 * used. Generation is idempotent: every occurrence derives a deterministic
 * transaction id, so restoring a backup or re-running the engine never
 * duplicates money movement.
 */
export interface Recurring {
  id: string;
  /** Short label — becomes the transaction note. */
  name: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  accountId?: string;
  freq: RecurFreq;
  /** ISO date (YYYY-MM-DD) the schedule starts. */
  startDate: string;
  /** ISO date of the next occurrence that has NOT been generated yet. */
  nextRun: string;
  /** ISO date of the last occurrence actually generated, if any. */
  lastRun?: string;
  paused: boolean;
  createdAt: number;
}

export interface Settings {
  currency: string; // ISO 4217, default PHP
  userName: string; // default "Aiserie"
  /**
   * Privacy shield (v4.0.0): cover balances with a branded curtain whenever
   * the app leaves the foreground (task switcher, another app, locked phone).
   * Optional for backward compatibility with stored settings from v3.x —
   * `undefined` counts as ON, the privacy-first default.
   */
  privacyShield?: boolean;
}

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

export interface CategoryTotal {
  category: Category;
  amount: number;
}

export interface MonthBar {
  ym: string; // YYYY-MM
  label: string; // e.g. "Jun"
  income: number;
  expense: number;
}

export type InsightTone = 'good' | 'warn' | 'risk' | 'info';

export interface Insight {
  id: string;
  emoji: string;
  tone: InsightTone;
  title: string;
  body: string;
}

export interface ParsedReceipt {
  total: number | null;
  merchant: string | null;
  itemCount: number;
  lines: string[];
}

/** One item on the Things-to-do list (money chores, goals, reminders). */
export interface Task {
  id: string;
  title: string;
  done: boolean;
  /** Starred tasks float to the top of the open list. */
  important: boolean;
  createdAt: number;
  doneAt?: number;
}

/** A savings goal — a piggy bank with a target worth reaching. */
export interface Goal {
  id: string;
  name: string;
  emoji: string;
  /** Positive target amount. */
  target: number;
  /** Amount already set aside. Never negative; may exceed target only via target edits. */
  saved: number;
  /** Optional wallet the goal money "lives" in (organisational only — balances stay independent). */
  accountId?: string;
  createdAt: number;
  /** Set the first time saved >= target. */
  completedAt?: number;
  /** Optional note: why this goal matters. */
  note?: string;
}
