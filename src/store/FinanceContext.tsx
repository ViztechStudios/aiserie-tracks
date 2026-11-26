import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistDebounced } from './storage';
import { Account, Settings, Transaction } from '../types';
import { DEFAULT_CURRENCY } from '../data/currencies';
import { buildSampleAccounts, buildSampleTransactions, makeId } from '../data/sampleData';

const TX_KEY = 'aiserie.v1.transactions';
const SETTINGS_KEY = 'aiserie.v1.settings';
const ACCOUNTS_KEY = 'aiserie.v1.accounts';

/** Every storage key the app can own — used by the full wipe and by backups. */
export const ALL_STORAGE_KEYS = [
  TX_KEY,
  ACCOUNTS_KEY,
  SETTINGS_KEY,
  'aiserie.v1.tasks',
  'aiserie.v1.budgets',
  'aiserie.v1.bills',
  'aiserie.v1.recurring',
  'aiserie.v1.budgetAlerts',
  'aiserie.v1.goals',
  'aiserie.v1.lock',
];

export interface NewTransactionInput {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  categoryId: string;
  date: string;
  note?: string;
  source?: 'manual' | 'scan' | 'sample' | 'detect' | 'recurring';
  accountId?: string;
  /** Transfer destination wallet. */
  toAccountId?: string;
  /** Deterministic id — recurring occurrences use one so re-runs never duplicate. */
  id?: string;
}

interface FinanceContextValue {
  ready: boolean;
  transactions: Transaction[];
  accounts: Account[];
  settings: Settings;
  addTransaction: (input: NewTransactionInput) => Transaction;
  /** Adds many transactions at once, skipping ids that already exist (backup restore, recurring engine). */
  addTransactionsUnique: (txs: Transaction[]) => number;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (input: Omit<Account, 'id' | 'updatedAt'>) => Account;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  /** Adds only wallets whose id is not already present (backup restore, merge mode). */
  mergeAccounts: (incoming: Account[]) => void;
  /** Replaces the whole transaction list (storage compaction, backup replace). */
  replaceTransactions: (txs: Transaction[]) => void;
  setCurrency: (code: string) => void;
  setUserName: (name: string) => void;
  /** Toggle the privacy shield (hide balances when the app is backgrounded). */
  setPrivacyShield: (enabled: boolean) => void;
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
            // v4.0.0 privacy shield — undefined in old settings counts as ON
            privacyShield: parsed.privacyShield !== false,
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
    persistDebounced(TX_KEY, JSON.stringify(transactions));
  }, [transactions, ready]);

  useEffect(() => {
    if (!ready) return;
    persistDebounced(ACCOUNTS_KEY, JSON.stringify(accounts));
  }, [accounts, ready]);

  useEffect(() => {
    if (!ready) return;
    persistDebounced(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, ready]);

  const addTransaction = useCallback((input: NewTransactionInput): Transaction => {
    const tx: Transaction = {
      id: input.id ?? makeId(),
      createdAt: Date.now(),
      source: input.source ?? 'manual',
      ...input,
    };
    setTransactions((prev) => [tx, ...prev]);
    return tx;
  }, []);

  const addTransactionsUnique = useCallback((txs: Transaction[]): number => {
    let added = 0;
    setTransactions((prev) => {
      const existing = new Set(prev.map((t) => t.id));
      const fresh = txs.filter((t) => t.id && !existing.has(t.id) && !(existing.add(t.id), false));
      added = fresh.length;
      return [...fresh, ...prev];
    });
    return added;
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

  const mergeAccounts = useCallback((incoming: Account[]) => {
    setAccounts((prev) => {
      const ids = new Set(prev.map((a) => a.id));
      const fresh = incoming.filter((a) => a.id && !ids.has(a.id) && !(ids.add(a.id), false));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  const replaceTransactions = useCallback((txs: Transaction[]) => setTransactions(txs), []);

  const setCurrency = useCallback((code: string) => {
    setSettings((s) => ({ ...s, currency: code }));
  }, []);

  const setUserName = useCallback((name: string) => {
    setSettings((s) => ({ ...s, userName: name.trim() || 'Aiserie' }));
  }, []);

  const setPrivacyShield = useCallback((enabled: boolean) => {
    setSettings((s) => ({ ...s, privacyShield: enabled }));
  }, []);

  const clearAllData = useCallback(async () => {
    setTransactions([]);
    setAccounts([]);
    // Wipe every trace the app can leave on the device — transactions,
    // wallets, settings, tasks, budgets and bills — so "Erase all data"
    // really erases everything (transactions/wallets are also reset in state).
    await AsyncStorage.multiRemove(ALL_STORAGE_KEYS).catch(() => {});
    setSettings({ currency: DEFAULT_CURRENCY, userName: 'Aiserie', privacyShield: true });
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
      addTransactionsUnique,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      mergeAccounts,
      replaceTransactions,
      setCurrency,
      setUserName,
      setPrivacyShield,
      clearAllData,
      loadSampleData,
    }),
    [
      ready,
      transactions,
      accounts,
      settings,
      addTransaction,
      addTransactionsUnique,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      mergeAccounts,
      replaceTransactions,
      setCurrency,
      setUserName,
      setPrivacyShield,
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
