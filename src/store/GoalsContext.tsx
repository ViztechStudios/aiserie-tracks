import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from '../types';
import { makeId } from '../data/sampleData';
import { applyGoalChange, completesGoal } from '../utils/goals';
import { loadStoredJson, persistDebouncedLazy } from './storage';

export const GOALS_KEY = 'aiserie.v1.goals';

interface GoalsContextValue {
  ready: boolean;
  goals: Goal[];
  addGoal: (input: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>) => Goal;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  /** Money in/out of a goal. Returns true when this move completes the goal. */
  moveGoal: (id: string, delta: number) => boolean;
  /** Adds only goals whose id is not already present (backup restore merge). */
  mergeGoals: (incoming: Goal[]) => void;
  replaceGoals: (goals: Goal[]) => void;
  /** Wipe every goal (used by Settings → Erase all data). */
  clearAll: () => void;
}

const GoalsContext = createContext<GoalsContextValue | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // v4.2.0: per-key parse; a damaged payload is quarantined, not overwritten
        const parsed = await loadStoredJson<Goal[]>(GOALS_KEY);
        if (Array.isArray(parsed)) setGoals(parsed);
      } catch {
        // storage read failed: start fresh rather than crash
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // coalesced write — see storage.ts
  useEffect(() => {
    if (!ready) return;
    persistDebouncedLazy(GOALS_KEY, goals);
  }, [goals, ready]);

  const addGoal = useCallback((input: Omit<Goal, 'id' | 'createdAt' | 'completedAt'>): Goal => {
    const goal: Goal = {
      id: makeId(),
      createdAt: Date.now(),
      completedAt: input.saved >= input.target && input.target > 0 ? Date.now() : undefined,
      ...input,
    };
    setGoals((prev) => [goal, ...prev]);
    return goal;
  }, []);

  const updateGoal = useCallback((goal: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...goal, saved: Math.max(goal.saved, 0) } : g)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const moveGoal = useCallback((id: string, delta: number): boolean => {
    let completed = false;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const next: Goal = { ...g, saved: applyGoalChange(g, delta) };
        if (completesGoal(g, delta)) {
          next.completedAt = Date.now();
          completed = true;
        }
        return next;
      })
    );
    return completed;
  }, []);

  const mergeGoals = useCallback((incoming: Goal[]) => {
    setGoals((prev) => {
      const ids = new Set(prev.map((g) => g.id));
      const fresh = incoming.filter((g) => g.id && !ids.has(g.id) && !(ids.add(g.id), false));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  const replaceGoals = useCallback((next: Goal[]) => setGoals(next), []);

  const clearAll = useCallback(() => setGoals([]), []);

  const value = useMemo(
    () => ({ ready, goals, addGoal, updateGoal, deleteGoal, moveGoal, mergeGoals, replaceGoals, clearAll }),
    [ready, goals, addGoal, updateGoal, deleteGoal, moveGoal, mergeGoals, replaceGoals, clearAll]
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used inside GoalsProvider');
  return ctx;
}
