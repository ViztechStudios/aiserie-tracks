import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistDebounced } from './storage';
import { Task } from '../types';
import { makeId } from '../data/sampleData';

const TASKS_KEY = 'aiserie.v1.tasks';

interface TasksContextValue {
  ready: boolean;
  tasks: Task[];
  openCount: number;
  doneCount: number;
  addTask: (title: string, important?: boolean) => Task;
  toggleTask: (id: string) => void;
  toggleImportant: (id: string) => void;
  removeTask: (id: string) => void;
  clearDone: () => void;
  /** Wipe the whole tasks list (used by Settings → Erase all data). */
  clearAll: () => Promise<void>;
  /** Used by backup restore: replaces the whole list. */
  replaceAll: (tasks: Task[]) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  // hydrate from device storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TASKS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Task[];
          if (Array.isArray(parsed)) setTasks(parsed);
        }
      } catch (e) {
        console.warn('Failed to load tasks', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // persist on change
  useEffect(() => {
    if (!ready) return;
    persistDebounced(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks, ready]);

  const addTask = useCallback((title: string, important = false): Task => {
    const task: Task = { id: makeId(), title: title.trim(), done: false, important, createdAt: Date.now() };
    if (!task.title) return task;
    setTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : undefined } : t
      )
    );
  }, []);

  const toggleImportant = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, important: !t.important } : t)));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setTasks((prev) => prev.filter((t) => !t.done));
  }, []);

  const clearAll = useCallback(async () => {
    setTasks([]);
    await AsyncStorage.removeItem(TASKS_KEY).catch(() => {});
  }, []);

  const replaceAll = useCallback((list: Task[]) => setTasks(list), []);

  const value = useMemo(() => {
    const doneCount = tasks.filter((t) => t.done).length;
    return {
      ready,
      tasks,
      openCount: tasks.length - doneCount,
      doneCount,
      addTask,
      toggleTask,
      toggleImportant,
      removeTask,
      clearDone,
      clearAll,
      replaceAll,
    };
  }, [ready, tasks, addTask, toggleTask, toggleImportant, removeTask, clearDone, clearAll, replaceAll]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used inside TasksProvider');
  return ctx;
}
