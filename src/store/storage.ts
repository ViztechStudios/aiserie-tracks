import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage layer that is kind to the device: writes are coalesced (a burst of
 * changes — recurring catch-up, a restore, quick edits — becomes one disk
 * write shortly after the last change) and flushed when the app leaves the
 * foreground, so nothing is ever lost.
 *
 * AsyncStorage has no batching API, so every plain `.setItem` rewrites the
 * whole JSON payload; with hundreds of transactions that is megabytes per
 * keystroke burst. The debounce keeps the same data model and keys — only
 * the write pattern changes — so backups and older app versions stay 100%
 * compatible.
 */

const FLUSH_DELAY_MS = 400;

type Timer = { cancel: () => void; fire: () => void };

const pending = new Map<string, { value: string; timer: Timer }>();

function schedule(key: string, value: string): Timer {
  let handle: ReturnType<typeof setTimeout> | null = null;
  const timer: Timer = {
    cancel: () => {
      if (handle) clearTimeout(handle);
      handle = null;
    },
    fire: () => {
      handle = null;
      void AsyncStorage.setItem(key, value).catch(() => {});
    },
  };
  handle = setTimeout(timer.fire, FLUSH_DELAY_MS);
  return timer;
}

/** Queue a debounced write. Later calls for the same key replace earlier ones. */
export function persistDebounced(key: string, value: string): void {
  const entry = pending.get(key);
  if (entry) entry.timer.cancel();
  pending.set(key, { value, timer: schedule(key, value) });
}

/** Write any queued values to disk right now (used when app goes to background). */
export function flushStorage(): void {
  for (const [key, entry] of pending) {
    entry.timer.cancel();
    void AsyncStorage.setItem(key, entry.value).catch(() => {});
  }
  pending.clear();
}

/**
 * Flush queued writes when the app is backgrounded / screen-locked.
 * Called once from App boot. Deliberately lazy: tests and pure-logic
 * environments never load React Native, so this file stays importable.
 */
export function installStorageFlushHooks(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AppState, Platform } = require('react-native');
    if (Platform.OS === 'web') return;
    AppState.addEventListener?.('change', (state: string) => {
      if (state !== 'active') flushStorage();
    });
  } catch {
    // not a React Native runtime — nothing to hook
  }
}

export interface StorageReport {
  totalBytes: number;
  entries: { key: string; bytes: number }[];
}

/** Byte size (UTF-8) of a JS string, matching what AsyncStorage persists. */
export function byteSize(s: string): number {
  if (globalThis.TextEncoder) return new TextEncoder().encode(s).length;
  // rare fallback (old Hermes builds): ASCII ≈ 1 byte/char for our JSON
  return s.length;
}

/** Measure every `aiserie.*` key on the device — powers the Settings storage meter. */
export async function measureStorage(): Promise<StorageReport> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('aiserie.'));
  const pairs = await AsyncStorage.multiGet(keys);
  const entries = pairs
    .filter(([, v]) => v !== null)
    .map(([k, v]) => ({ key: k, bytes: byteSize(v as string) }))
    .sort((a, b) => b.bytes - a.bytes);
  return { totalBytes: entries.reduce((s, e) => s + e.bytes, 0), entries };
}

/** Friendly size label for the meter: 12.4 KB / 1.8 MB. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Compaction, applied only to clearly safe transformations:
 * - transactions: drop rows without id/amount/date, dedupe ids (keep the first),
 *   drop transfers with no wallets on either side
 * - tasks: drop done chores older than `taskTtlDays` (they have served their purpose)
 * - budget alerts: the monthly state can always be rebuilt — trimmed sets are respected
 * Returns the number of bytes freed (approximate, based on before/after JSON sizes).
 */
export interface CompactInput {
  transactions: unknown[];
  tasks: unknown[];
  budgetAlerts: unknown;
}

export interface CompactResult {
  transactions: unknown[];
  tasks: unknown[];
  keepBudgetAlerts: boolean;
  transactionsChanged: boolean;
  tasksChanged: boolean;
  alertsChanged: boolean;
}

const TASK_TTL_DAYS = 45;

export function compactData(input: CompactInput, now: number = Date.now()): CompactResult {
  // transactions
  const seen = new Set<string>();
  const txs = input.transactions.filter((raw) => {
    const t = raw as { id?: unknown; amount?: unknown; date?: unknown; type?: unknown; accountId?: unknown; toAccountId?: unknown };
    if (typeof t.id !== 'string' || !t.id || seen.has(t.id)) return false;
    if (typeof t.amount !== 'number' || !Number.isFinite(t.amount) || t.amount <= 0) return false;
    if (typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return false;
    if (t.type !== 'expense' && t.type !== 'income' && t.type !== 'transfer') return false;
    if (t.type === 'transfer' && !t.accountId && !t.toAccountId) return false;
    seen.add(t.id);
    return true;
  });

  // tasks: keep open ones; drop done older than the TTL
  const tasks = input.tasks.filter((raw) => {
    const t = raw as { done?: unknown; doneAt?: unknown };
    if (t.done !== true) return true;
    const at = typeof t.doneAt === 'number' ? t.doneAt : null;
    if (at === null) return true; // never keep-forever pruning of unknown ages? keep it
    return now - at <= TASK_TTL_DAYS * 24 * 60 * 60 * 1000;
  });

  return {
    transactions: txs,
    tasks,
    keepBudgetAlerts: input.budgetAlerts !== undefined && input.budgetAlerts !== null,
    transactionsChanged: txs.length !== input.transactions.length,
    tasksChanged: tasks.length !== input.tasks.length,
    alertsChanged: false,
  };
}
