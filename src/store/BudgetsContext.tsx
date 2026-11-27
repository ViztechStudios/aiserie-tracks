import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStoredJson, persistDebouncedLazy } from './storage';
import { Budget } from '../types';
import { makeId } from '../data/sampleData';
import { AlertState } from '../utils/budgetAlerts';

const BUDGETS_KEY = 'aiserie.v1.budgets';
const ALERTS_KEY = 'aiserie.v1.budgetAlerts';

interface BudgetsContextValue {
  ready: boolean;
  budgets: Budget[];
  /** "budgetId:ym" → highest spending threshold already announced. */
  alertState: AlertState;
  addBudget: (categoryId: string, cap: number) => void;
  updateBudget: (budget: Budget) => void;
  removeBudget: (id: string) => void;
  /** Only one budget per category — replaces the cap if it already exists. */
  upsertBudget: (categoryId: string, cap: number, alerts?: number[]) => void;
  /** Clear the "already announced" state — a fresh start for the month. */
  resetAlerts: (budgetId?: string, ym?: string) => void;
  /** Used by backup restore: replaces the whole list. */
  replaceAll: (budgets: Budget[]) => void;
  setAlertState: (state: AlertState) => void;
  clearAll: () => Promise<void>;
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null);

export function BudgetsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [alertState, setAlertStateRaw] = useState<AlertState>({});

  useEffect(() => {
    (async () => {
      try {
        // v4.2.0: per-key parse; a damaged payload is quarantined, not overwritten —
        // one broken alerts file can no longer take the budgets list down with it
        const parsed = await loadStoredJson<Budget[]>(BUDGETS_KEY);
        if (Array.isArray(parsed)) setBudgets(parsed);
        const alerts = await loadStoredJson<AlertState>(ALERTS_KEY);
        if (alerts && typeof alerts === 'object') setAlertStateRaw(alerts);
      } catch {
        // storage read failed: start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    persistDebouncedLazy(BUDGETS_KEY, budgets);
  }, [budgets, ready]);

  useEffect(() => {
    if (!ready) return;
    persistDebouncedLazy(ALERTS_KEY, alertState);
  }, [alertState, ready]);

  const upsertBudget = useCallback((categoryId: string, cap: number, alerts?: number[]) => {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.categoryId === categoryId);
      if (existing) {
        return prev.map((b) => (b.id === existing.id ? { ...b, cap, alerts: alerts ?? b.alerts } : b));
      }
      return [...prev, { id: makeId(), categoryId, cap, createdAt: Date.now(), alerts }];
    });
  }, []);

  const addBudget = upsertBudget;
  const updateBudget = useCallback((budget: Budget) => {
    setBudgets((prev) => prev.map((b) => (b.id === budget.id ? budget : b)));
  }, []);
  const removeBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    setAlertStateRaw((prev) => {
      const next: AlertState = {};
      for (const [k, v] of Object.entries(prev)) if (!k.startsWith(`${id}:`)) next[k] = v;
      return next;
    });
  }, []);
  const resetAlerts = useCallback((budgetId?: string, ym?: string) => {
    setAlertStateRaw((prev) => {
      if (!budgetId && !ym) return {};
      const next: AlertState = {};
      for (const [k, v] of Object.entries(prev)) {
        const [bid, key] = k.split(':');
        if (budgetId && bid !== budgetId) next[k] = v;
        else if (ym && key !== ym) next[k] = v;
      }
      return next;
    });
  }, []);
  const setAlertState = useCallback((state: AlertState) => setAlertStateRaw(state), []);
  const replaceAll = useCallback((list: Budget[]) => setBudgets(list), []);
  const clearAll = useCallback(async () => {
    setBudgets([]);
    setAlertStateRaw({});
    await AsyncStorage.multiRemove([BUDGETS_KEY, ALERTS_KEY]).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      ready,
      budgets,
      alertState,
      addBudget,
      updateBudget,
      removeBudget,
      upsertBudget,
      resetAlerts,
      replaceAll,
      setAlertState,
      clearAll,
    }),
    [ready, budgets, alertState, addBudget, updateBudget, removeBudget, upsertBudget, resetAlerts, replaceAll, setAlertState, clearAll]
  );

  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export function useBudgets(): BudgetsContextValue {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error('useBudgets must be used inside BudgetsProvider');
  return ctx;
}
