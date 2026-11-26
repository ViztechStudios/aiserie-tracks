import { Account, Transaction } from '../types';

/** Net amount of transactions linked to an account (income − expense), including transfers in/out. */
export function accountNet(accountId: string, txs: Transaction[]): number {
  return txs.reduce((sum, t) => {
    if (t.type === 'transfer') {
      // money leaves the source wallet and lands in the destination wallet
      if (t.accountId === accountId) return sum - t.amount;
      if (t.toAccountId === accountId) return sum + t.amount;
      return sum;
    }
    if (t.accountId !== accountId) return sum;
    return sum + (t.type === 'income' ? t.amount : -t.amount);
  }, 0);
}

/** Current balance = declared balance + net of linked transactions. */
export function accountBalance(account: Account, txs: Transaction[]): number {
  return Math.round((account.openingBalance + accountNet(account.id, txs)) * 100) / 100;
}

/**
 * Returns a new openingBalance so the account's displayed current balance
 * equals `targetBalance` (reconciliation after manual top-up/correction).
 */
export function openingForBalance(account: Account, txs: Transaction[], targetBalance: number): number {
  const net = accountNet(account.id, txs);
  return Math.round((targetBalance - net) * 100) / 100;
}

export const ACCOUNT_TYPE_LABEL: Record<Account['type'], string> = {
  ewallet: 'E-wallet',
  bank: 'Bank',
  cash: 'Cash',
};

export const ACCOUNT_EMOJIS = ['📱', '💳', '🏦', '💵', '🪙', '💰'];

export const ACCOUNT_COLORS = ['#0EA5E9', '#16B8A0', '#F5A524', '#6366F1', '#F45B69', '#8B5CF6'];
