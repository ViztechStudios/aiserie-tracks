import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Settings, Transaction } from '../types';
import { DEFAULT_CURRENCY } from '../data/currencies';
import { buildSampleAccounts, buildSampleTransactions, makeId } from '../data/sampleData';

const TX_KEY = 'aiserie.v1.transactions';
const SETTINGS_KEY = 'aiserie.v1.settings';
const ACCOUNTS_KEY = 'aiserie.v1.accounts';

/** Every storage key the app can own — used by the full wipe. */
export const ALL_STORAGE_KEYS = [
  TX_KEY,
  ACCOUNTS_KEY,
  SETTINGS_KEY,
  'aiserie.v1.tasks',
  'aiserie.v1.budgets',
  'aiserie.v1.bills',
];

export interface NewTransactionInput {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  categoryId: string;
  date: string;
  note?: string;
  source?: 'manual' | 'scan' | 'sample' | 'detect';
  accountId?: string;
  /** Transfer destination wallet. */
  toAccountId?: string;
}

interface FinanceContextValue {
  ready: boolean;
  transactions: Transaction[];
  accounts: Account[];
  settings: Settings;
  addTransaction: (input: NewTransactionInput) => Transaction;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (input: Omit<Account, 'id' | 'updatedAt'>) => Account;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  setCurrency: (code: string) => void;
  setUserName: (name: string) => void;
  clearAllData: () => Promise<void>;
  loadSampleData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<Settings>({ currency: DEFAULT_CURRENCY, userName: 'Aiserie' });

  // hydrate from device storage
  useEffect(() => {
    (async () => {
      try {
        const [txRaw, settingsRaw, accountsRaw] = await Promise.all([
          AsyncStorage.getItem(TX_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(ACCOUNTS_KEY),
        ]);
        if (txRaw) {
          const parsed = JSON.parse(txRaw) as Transaction[];
          if (Array.isArray(parsed)) setTransactions(parsed);
        }
        if (accountsRaw) {
          const parsed = JSON.parse(accountsRaw) as Account[];
          if (Array.isArray(parsed)) setAccounts(parsed);
        }
        if (settingsRaw) {
          const parsed = JSON.parse(settingsRaw) as Partial<Settings>;
          setSettings({
            currency: typeof parsed.currency === 'string' ? parsed.currency : DEFAULT_CURRENCY,
            userName: typeof parsed.userName === 'string' && parsed.userName.trim() ? parsed.userName : 'Aiserie',
          });
        }
      } catch (e) {
        // corrupted storage: start fresh rather than crash
        console.warn('Failed to load saved data', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // persist on change
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(TX_KEY, JSON.stringify(transactions)).catch(() => {});
  }, [transactions, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)).catch(() => {});
  }, [accounts, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);

  const addTransaction = useCallback((input: NewTransactionInput): Transaction => {
    const tx: Transaction = {
      id: makeId(),
      createdAt: Date.now(),
      source: input.source ?? 'manual',
      ...input,
    };
    setTransactions((prev) => [tx, ...prev]);
    return tx;
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addAccount = useCallback((input: Omit<Account, 'id' | 'updatedAt'>): Account => {
    const account: Account = { id: makeId(), updatedAt: Date.now(), ...input };
    setAccounts((prev) => [...prev, account]);
    return account;
  }, []);

  const updateAccount = useCallback((account: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...account, updatedAt: Date.now() } : a)));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    // unlink transactions that referenced this wallet
    setTransactions((prev) =>
      prev.map((t) => {
        const next = { ...t };
        if (next.accountId === id) next.accountId = undefined;
        if (next.toAccountId === id) next.toAccountId = undefined;
        // a transfer with neither side left becomes meaningless — drop it
        if (next.type === 'transfer' && !next.accountId && !next.toAccountId) return null;
        return next;
      }).filter((t): t is Transaction => t !== null)
    );
  }, []);

  const setCurrency = useCallback((code: string) => {
    setSettings((s) => ({ ...s, currency: code }));
  }, []);

  const setUserName = useCallback((name: string) => {
    setSettings((s) => ({ ...s, userName: name.trim() || 'Aiserie' }));
  }, []);

  const clearAllData = useCallback(async () => {
    setTransactions([]);
    setAccounts([]);
    // Wipe every trace the app can leave on the device — transactions,
    // wallets, settings, tasks, budgets and bills — so "Erase all data"
    // really erases everything (transactions/wallets are also reset in state).
    await AsyncStorage.multiRemove(ALL_STORAGE_KEYS).catch(() => {});
    setSettings({ currency: DEFAULT_CURRENCY, userName: 'Aiserie' });
  }, []);

  const loadSampleData = useCallback(() => {
    const sampleAccounts = buildSampleAccounts();
    setTransactions(buildSampleTransactions(4, sampleAccounts));
    setAccounts((prev) => (prev.length > 0 ? prev : sampleAccounts));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      transactions,
      accounts,
      settings,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      setCurrency,
      setUserName,
      clearAllData,
      loadSampleData,
    }),
    [
      ready,
      transactions,
      accounts,
      settings,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      setCurrency,
      setUserName,
      clearAllData,
      loadSampleData,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
