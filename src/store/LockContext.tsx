import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LockConfig,
  LockGuard,
  LOCK_GUARD_KEY,
  LOCK_KEY,
  guardRemainingMs,
  hashPin,
  isPinAcceptable,
  makeSalt,
  recordFailedAttempt,
  verifyPin,
} from '../utils/pinlock';

interface LockContextValue {
  ready: boolean;
  /** Undefined while loading; null = no lock configured; config = lock exists. */
  config: LockConfig | null | undefined;
  unlocked: boolean;
  /** Failed-attempt guard (attempts + lockout window), persisted. */
  guard: LockGuard;
  /** Ms remaining on the current lockout; 0 = the pad is open. */
  lockoutRemainingMs: () => number;
  /** Create or replace the PIN. Returns false if the pin is unusable. */
  setPin: (pin: string) => boolean;
  /** Turn the lock off. Returns false when the current pin is wrong. */
  disable: (pin: string) => boolean;
  /** Record a wrong attempt; extends the persisted lockout when earned. */
  noteFailure: () => void;
  /** Record a successful verify; clears attempts. */
  noteSuccess: () => void;
  /** Re-save a legacy (kdf 1) config as key-stretched after a successful verify. */
  upgradeConfig: (pin: string) => void;
  lockNow: () => void;
  unlock: () => void;
}

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<LockConfig | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState(false);
  const [guard, setGuard] = useState<LockGuard>({ attempts: 0, lockedUntil: 0 });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCK_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LockConfig;
          if (parsed && parsed.enabled && typeof parsed.hash === 'string') setConfig(parsed);
          else setConfig(null);
        } else setConfig(null);
      } catch {
        setConfig(null);
      }
      try {
        const graw = await AsyncStorage.getItem(LOCK_GUARD_KEY);
        if (graw) {
          const g = JSON.parse(graw) as LockGuard;
          if (g && typeof g.attempts === 'number') setGuard({ attempts: g.attempts, lockedUntil: g.lockedUntil || 0 });
        }
      } catch {
        // a broken guard record must never lock the owner out — start clean
        setGuard({ attempts: 0, lockedUntil: 0 });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((next: LockConfig | null) => {
    setConfig(next);
    if (next === null) AsyncStorage.removeItem(LOCK_KEY).catch(() => {});
    else AsyncStorage.setItem(LOCK_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const persistGuard = useCallback((next: LockGuard) => {
    setGuard(next);
    AsyncStorage.setItem(LOCK_GUARD_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setPin = useCallback(
    (pin: string): boolean => {
      // enforced here, not only in the Settings UI — the context is the policy
      if (!isPinAcceptable(pin)) return false;
      const salt = makeSalt();
      persist({ enabled: true, salt, hash: hashPin(pin, salt), kdf: 2 });
      setUnlocked(true);
      persistGuard({ attempts: 0, lockedUntil: 0 });
      return true;
    },
    [persist, persistGuard]
  );

  const disable = useCallback(
    (pin: string): boolean => {
      if (!config || !verifyPin(pin, config).ok) return false;
      persist(null);
      persistGuard({ attempts: 0, lockedUntil: 0 });
      return true;
    },
    [config, persist, persistGuard]
  );

  const noteFailure = useCallback(() => {
    persistGuard(recordFailedAttempt(guard));
  }, [guard, persistGuard]);

  const noteSuccess = useCallback(() => {
    persistGuard({ attempts: 0, lockedUntil: 0 });
  }, [persistGuard]);

  /** Upgrade a legacy hash after a successful verify with the raw pin in hand. */
  const upgradeConfig = useCallback(
    (pin: string) => {
      if (!config || config.kdf === 2) return;
      const salt = makeSalt();
      persist({ enabled: true, salt, hash: hashPin(pin, salt), kdf: 2 });
    },
    [config, persist]
  );

  const value = useMemo(
    () => ({
      ready,
      config: ready ? config : undefined,
      unlocked,
      guard,
      lockoutRemainingMs: () => guardRemainingMs(guard),
      setPin,
      disable,
      noteFailure,
      noteSuccess,
      upgradeConfig,
      lockNow: () => setUnlocked(false),
      unlock: () => setUnlocked(true),
    }),
    [ready, config, unlocked, guard, setPin, disable, noteFailure, noteSuccess, upgradeConfig]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside LockProvider');
  return ctx;
}
