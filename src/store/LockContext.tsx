import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LockConfig, LOCK_KEY, hashPin, makeSalt, verifyPin } from '../utils/pinlock';

interface LockContextValue {
  ready: boolean;
  /** Undefined while loading; null = no lock configured; config = lock exists. */
  config: LockConfig | null | undefined;
  unlocked: boolean;
  /** Create or replace the PIN. Returns false if the pin is unusable. */
  setPin: (pin: string) => boolean;
  /** Turn the lock off. Returns false when the current pin is wrong. */
  disable: (pin: string) => boolean;
  lockNow: () => void;
  unlock: () => void;
}

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<LockConfig | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState(false);

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

  const setPin = useCallback(
    (pin: string): boolean => {
      const salt = makeSalt();
      persist({ enabled: true, salt, hash: hashPin(pin, salt) });
      setUnlocked(true);
      return true;
    },
    [persist]
  );

  const disable = useCallback(
    (pin: string): boolean => {
      if (!config || !verifyPin(pin, config)) return false;
      persist(null);
      return true;
    },
    [config, persist]
  );

  const value = useMemo(
    () => ({
      ready,
      config: ready ? config : undefined,
      unlocked,
      setPin,
      disable,
      lockNow: () => setUnlocked(false),
      unlock: () => setUnlocked(true),
    }),
    [ready, config, unlocked, setPin, disable]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside LockProvider');
  return ctx;
}
