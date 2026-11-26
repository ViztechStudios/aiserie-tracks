import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistDebounced } from './storage';
import { Recurring, RecurFreq } from '../types';
import { makeId } from '../data/sampleData';
import { useFinance } from './FinanceContext';
import { generateDue, isISODate, sanitizeRules } from '../utils/recurring';
import { todayISO } from '../utils/stats';

const RECUR_KEY = 'aiserie.v1.recurring';

interface RecurringContextValue {
  ready: boolean;
  recurrings: Recurring[];
  addRecurring: (input: Omit<Recurring, 'id' | 'createdAt' | 'nextRun' | 'lastRun' | 'paused'> & { paused?: boolean }) => void;
  updateRecurring: (rule: Recurring) => void;
  removeRecurring: (id: string) => void;
  setPaused: (id: string, paused: boolean) => void;
  /** Used by backup restore: replaces the whole list. */
  replaceAll: (rules: Recurring[]) => void;
  /** Pending transactions from the latest engine run (for status display). */
  lastRunInfo: { created: number; at: number } | null;
  clearAll: () => Promise<void>;
}

const RecurringContext = createContext<RecurringContextValue | null>(null);

const DEFAULT_NEXT = (input: { freq: RecurFreq; startDate: string }): string =>
  isISODate(input.startDate) ? input.startDate : todayISO();

export function RecurringProvider({ children }: { children: React.ReactNode }) {
  const finance = useFinance();
  const [ready, setReady] = useState(false);
  const [recurrings, setRecurrings] = useState<Recurring[]>([]);
  const [lastRunInfo, setLastRunInfo] = useState<{ created: number; at: number } | null>(null);
  const bootRan = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECUR_KEY);
        if (raw) {
          // repair-in-place: rules from older versions or interrupted writes
          // are completed so the engine and cards can trust every field
          const repaired = sanitizeRules(JSON.parse(raw));
          setRecurrings(repaired);
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
    persistDebounced(RECUR_KEY, JSON.stringify(recurrings));
  }, [recurrings, ready]);

  const addRecurring = useCallback<RecurringContextValue['addRecurring']>((input) => {
    setRecurrings((prev) => [
      ...prev,
      {
        ...input,
        paused: input.paused ?? false,
        id: makeId(),
        createdAt: Date.now(),
        nextRun: DEFAULT_NEXT(input),
      },
    ]);
  }, []);

  const updateRecurring = useCallback((rule: Recurring) => {
    setRecurrings((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
  }, []);

  const removeRecurring = useCallback((id: string) => {
    // past occurrences the engine already wrote stay in the ledger — the user
    // can delete those like any other transaction
    setRecurrings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const setPaused = useCallback((id: string, paused: boolean) => {
    setRecurrings((prev) => prev.map((r) => (r.id === id ? { ...r, paused } : r)));
  }, []);

  const replaceAll = useCallback((list: Recurring[]) => setRecurrings(list), []);

  const clearAll = useCallback(async () => {
    setRecurrings([]);
    await AsyncStorage.removeItem(RECUR_KEY).catch(() => {});
  }, []);

  // ---- generation engine -------------------------------------------------
  // Runs when data is ready, when the list changes, and whenever the app
  // comes back to the foreground. The pure engine is idempotent, so extra
  // runs are always safe.
  useEffect(() => {
    if (!ready || !finance.ready) return;
    if (recurrings.length === 0) return;

    const run = () => {
      const today = todayISO();
      const existing = new Set(finance.transactions.map((t) => t.id));
      const { created, updates } = generateDue(recurrings, existing, today);
      if (created.length > 0) finance.addTransactionsUnique(created);
      if (updates.length > 0) {
        setRecurrings((prev) =>
          prev.map((r) => {
            const u = updates.find((x) => x.id === r.id);
            return u ? { ...r, nextRun: u.nextRun, lastRun: u.lastRun } : r;
          })
        );
      }
      if (created.length > 0) setLastRunInfo({ created: created.length, at: Date.now() });
    };

    if (!bootRan.current) {
      bootRan.current = true;
      // let the first paint settle before writing
      const t = setTimeout(run, 700);
      return () => clearTimeout(t);
    }

    let cleanup: (() => void) | undefined;
    if (Platform.OS === 'web') {
      const onVisible = () => {
        if (document.visibilityState === 'visible') run();
      };
      document.addEventListener('visibilitychange', onVisible);
      cleanup = () => document.removeEventListener('visibilitychange', onVisible);
    } else {
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') run();
      });
      cleanup = () => sub.remove();
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, finance.ready, recurrings]);

  const value = useMemo(
    () => ({
      ready,
      recurrings,
      addRecurring,
      updateRecurring,
      removeRecurring,
      setPaused,
      replaceAll,
      lastRunInfo,
      clearAll,
    }),
    [ready, recurrings, addRecurring, updateRecurring, removeRecurring, setPaused, replaceAll, lastRunInfo, clearAll]
  );

  return <RecurringContext.Provider value={value}>{children}</RecurringContext.Provider>;
}

export function useRecurring(): RecurringContextValue {
  const ctx = useContext(RecurringContext);
  if (!ctx) throw new Error('useRecurring must be used inside RecurringProvider');
  return ctx;
}
