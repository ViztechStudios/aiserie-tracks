import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistDebounced } from './storage';
import { Bill } from '../types';
import { makeId } from '../data/sampleData';

const BILLS_KEY = 'aiserie.v1.bills';

interface BillsContextValue {
  ready: boolean;
  bills: Bill[];
  addBill: (input: Omit<Bill, 'id' | 'createdAt'>) => void;
  updateBill: (bill: Bill) => void;
  removeBill: (id: string) => void;
  clearAll: () => Promise<void>;
  /** Used by backup restore: replaces the whole list. */
  replaceAll: (bills: Bill[]) => void;
}

const BillsContext = createContext<BillsContextValue | null>(null);

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BILLS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Bill[];
          if (Array.isArray(parsed)) setBills(parsed);
        }
      } catch {
        // corrupted storage: start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    persistDebounced(BILLS_KEY, JSON.stringify(bills));
  }, [bills, ready]);

  const addBill = useCallback((input: Omit<Bill, 'id' | 'createdAt'>) => {
    setBills((prev) => [...prev, { ...input, id: makeId(), createdAt: Date.now() }]);
  }, []);
  const updateBill = useCallback((bill: Bill) => {
    setBills((prev) => prev.map((b) => (b.id === bill.id ? bill : b)));
  }, []);
  const removeBill = useCallback((id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }, []);
  const clearAll = useCallback(async () => {
    setBills([]);
    await AsyncStorage.removeItem(BILLS_KEY).catch(() => {});
  }, []);

  const replaceAll = useCallback((list: Bill[]) => setBills(list), []);

  const value = useMemo(
    () => ({ ready, bills, addBill, updateBill, removeBill, clearAll, replaceAll }),
    [ready, bills, addBill, updateBill, removeBill, clearAll, replaceAll]
  );

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBills(): BillsContextValue {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error('useBills must be used inside BillsProvider');
  return ctx;
}
