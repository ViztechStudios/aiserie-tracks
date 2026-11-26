export type TxType = 'expense' | 'income' | 'transfer';

export type TxSource = 'manual' | 'scan' | 'sample' | 'detect';

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

export interface Settings {
  currency: string; // ISO 4217 code, default PHP
  userName: string; // default "Aiserie"
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
