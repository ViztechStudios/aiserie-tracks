import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Appearance, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, shadowFor, ThemeColors, gradientsFor, auroraFor } from '../theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'aiserie.v1.themeMode';

interface ThemeContextValue {
  /** User preference: follow the OS, or force light/dark. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Resolved scheme after applying the system preference. */
  isDark: boolean;
  /** Snapped palette for the current scheme (text colors, icons, charts). */
  t: ThemeColors;
  /** 0 -> light, 1 -> dark. Drives every animated surface cross-fade. */
  progress: Animated.AnimatedInterpolation<number>;
  rawProgress: Animated.Value;
  gradients: ReturnType<typeof gradientsFor>;
  aurora: ReturnType<typeof auroraFor>;
  shadow: ReturnType<typeof shadowFor>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(mode: ThemeMode, system: 'light' | 'dark' | null): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return system === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark' | null>(() => {
    const s = Appearance.getColorScheme();
    return s === 'dark' || s === 'light' ? s : null;
  });
  const [hydrated, setHydrated] = useState(false);
  const progress = useRef(new Animated.Value(0)).current; // 0 = light

  // hydrate saved preference
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setModeState(raw);
        }
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const isDark = resolveIsDark(mode, systemScheme);

  // animate the cross-fade whenever the resolved scheme flips
  useEffect(() => {
    Animated.timing(progress, {
      toValue: isDark ? 1 : 0,
      duration: 460,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false, // color interpolation runs on the JS thread
    }).start();
  }, [isDark, progress]);

  // follow the OS when mode === 'system'
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' || colorScheme === 'light' ? colorScheme : null);
    });
    return () => sub.remove();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      isDark,
      t: isDark ? darkColors : lightColors,
      progress,
      rawProgress: progress,
      gradients: gradientsFor(isDark),
      aurora: auroraFor(isDark),
      shadow: shadowFor(isDark),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, isDark, systemScheme, progress]
  );

  if (!hydrated) {
    // first paint: keep the native splash up rather than flashing light colors
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
