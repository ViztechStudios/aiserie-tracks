import { Category } from '../types';

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'groceries', label: 'Groceries', emoji: '🛒', color: '#0EA5E9', type: 'expense' },
  { id: 'food', label: 'Food & Dining', emoji: '🍜', color: '#F5A524', type: 'expense' },
  { id: 'transport', label: 'Transport', emoji: '🚌', color: '#22D3EE', type: 'expense' },
  { id: 'bills', label: 'Bills & Utilities', emoji: '💡', color: '#8B5CF6', type: 'expense' },
  { id: 'rent', label: 'Rent', emoji: '🏠', color: '#6366F1', type: 'expense' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#F45B69', type: 'expense' },
  { id: 'health', label: 'Health', emoji: '💊', color: '#12B76A', type: 'expense' },
  { id: 'education', label: 'Education', emoji: '📚', color: '#F59E0B', type: 'expense' },
  { id: 'fun', label: 'Fun & Leisure', emoji: '🎮', color: '#EC4899', type: 'expense' },
  { id: 'other-exp', label: 'Other', emoji: '⭐', color: '#94A3B8', type: 'expense' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', emoji: '💼', color: '#16B8A0', type: 'income' },
  { id: 'business', label: 'Business', emoji: '🏪', color: '#0EA5E9', type: 'income' },
  { id: 'bonus', label: 'Bonus', emoji: '🎁', color: '#F5A524', type: 'income' },
  { id: 'other-inc', label: 'Other', emoji: '💰', color: '#6366F1', type: 'income' },
];

/** Pseudo-category for wallet-to-wallet transfers (not real spending). */
export const TRANSFER_CATEGORY: Category = {
  id: 'transfer',
  label: 'Transfer',
  emoji: '🔁',
  color: '#2E9B63',
  type: 'transfer',
};

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, TRANSFER_CATEGORY];

export function categoriesFor(type: 'expense' | 'income' | 'transfer'): Category[] {
  if (type === 'transfer') return [TRANSFER_CATEGORY];
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export function getCategory(id: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}

/** Fallback category used when an id is unknown (e.g. older data). */
export const FALLBACK_CATEGORY: Category = {
  id: 'other-exp',
  label: 'Other',
  emoji: '⭐',
  color: '#94A3B8',
  type: 'expense',
};
