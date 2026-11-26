import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Budget } from '../types';
import { makeId } from '../data/sampleData';

const BUDGETS_KEY = 'aiserie.v1.budgets';

interface BudgetsContextValue {
  ready: boolean;
  budgets: Budget[];
  addBudget: (categoryId: string, cap: number) => void;
  updateBudget: (budget: Budget) => void;
  removeBudget: (id: string) => void;
  /** Only one budget per category — replaces the cap if it already exists. */
  upsertBudget: (categoryId: string, cap: number) => void;
  clearAll: () => Promise<void>;
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null);

export function BudgetsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BUDGETS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Budget[];
          if (Array.isArray(parsed)) setBudgets(parsed);
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
    AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets)).catch(() => {});
  }, [budgets, ready]);

  const upsertBudget = useCallback((categoryId: string, cap: number) => {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.categoryId === categoryId);
      if (existing) {
        return prev.map((b) => (b.id === existing.id ? { ...b, cap } : b));
      }
      return [...prev, { id: makeId(), categoryId, cap, createdAt: Date.now() }];
    });
  }, []);

  const addBudget = upsertBudget;
  const updateBudget = useCallback((budget: Budget) => {
    setBudgets((prev) => prev.map((b) => (b.id === budget.id ? budget : b)));
  }, []);
  const removeBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);
  const clearAll = useCallback(async () => {
    setBudgets([]);
    await AsyncStorage.removeItem(BUDGETS_KEY).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ ready, budgets, addBudget, updateBudget, removeBudget, upsertBudget, clearAll }),
    [ready, budgets, addBudget, updateBudget, removeBudget, upsertBudget, clearAll]
  );

  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export function useBudgets(): BudgetsContextValue {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error('useBudgets must be used inside BudgetsProvider');
  return ctx;
}
