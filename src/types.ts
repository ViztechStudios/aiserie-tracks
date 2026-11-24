export type TxType = 'expense' | 'income';

export interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
  type: TxType;
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
  source: 'manual' | 'scan' | 'sample';
  createdAt: number;
}

export interface Settings {
  currency: string; // ISO 4217 code, default PHP
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
