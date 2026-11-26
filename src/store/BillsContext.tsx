import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    AsyncStorage.setItem(BILLS_KEY, JSON.stringify(bills)).catch(() => {});
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

  const value = useMemo(
    () => ({ ready, bills, addBill, updateBill, removeBill, clearAll }),
    [ready, bills, addBill, updateBill, removeBill, clearAll]
  );

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBills(): BillsContextValue {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error('useBills must be used inside BillsProvider');
  return ctx;
}
