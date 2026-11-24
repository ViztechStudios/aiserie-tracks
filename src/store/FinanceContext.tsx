import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Transaction } from '../types';
import { DEFAULT_CURRENCY } from '../data/currencies';
import { buildSampleTransactions, makeId } from '../data/sampleData';

const TX_KEY = 'aiserie.v1.transactions';
const SETTINGS_KEY = 'aiserie.v1.settings';

export interface NewTransactionInput {
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  date: string;
  note?: string;
  source?: 'manual' | 'scan';
}

interface FinanceContextValue {
  ready: boolean;
  transactions: Transaction[];
  settings: Settings;
  addTransaction: (input: NewTransactionInput) => Transaction;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  setCurrency: (code: string) => void;
  clearAllData: () => Promise<void>;
  loadSampleData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>({ currency: DEFAULT_CURRENCY });

  // hydrate from device storage
  useEffect(() => {
    (async () => {
      try {
        const [txRaw, settingsRaw] = await Promise.all([
          AsyncStorage.getItem(TX_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (txRaw) {
          const parsed = JSON.parse(txRaw) as Transaction[];
          if (Array.isArray(parsed)) setTransactions(parsed);
        }
        if (settingsRaw) {
          const parsed = JSON.parse(settingsRaw) as Settings;
          if (parsed && typeof parsed.currency === 'string') setSettings(parsed);
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

  const setCurrency = useCallback((code: string) => {
    setSettings((s) => ({ ...s, currency: code }));
  }, []);

  const clearAllData = useCallback(async () => {
    setTransactions([]);
    await AsyncStorage.removeItem(TX_KEY);
  }, []);

  const loadSampleData = useCallback(() => {
    setTransactions(buildSampleTransactions(4));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      transactions,
      settings,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      setCurrency,
      clearAllData,
      loadSampleData,
    }),
    [ready, transactions, settings, addTransaction, updateTransaction, deleteTransaction, setCurrency, clearAllData, loadSampleData]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
