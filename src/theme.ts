/**
 * Aiserie Tracks v2.0.2 — "Manila Gold" design system, light + dark.
 *
 * Design language: Filipino coastal, human-crafted. Warm capiz-cream paper
 * surfaces, deep sea-ink navy, golden-hour accents, a woven banig texture,
 * and a capiz-shell iridescent edge reserved for hero cards. One serif
 * (Lora) carries the headings so the app reads editorial, not generated.
 *
 * Light: capiz cream paper / deep sea ink.
 * Dark: midnight Manila navy / warm gold.
 * ThemeContext drives a 0->1 progress value so every surface cross-fades.
 */
import { Animated, Platform } from 'react-native';

export interface ThemeColors {
  // brand — sea + sun
  ocean900: string;
  ocean800: string;
  ocean600: string;
  ocean500: string;
  aqua400: string;
  aqua300: string;
  /** Golden-hour accent — tab indicator, warm highlights. */
  sun500: string;
  sun300: string;
  ice50: string;
  ice100: string;

  // surfaces & text
  bg: string;
  /** Solid card surface — paper, not glass. */
  card: string;
  /** Alias of card; kept for call sites that want "definitely opaque". */
  cardSolid: string;
  /** Hairline border that holds a paper edge. */
  glassBorder: string;
  glassBorderSoft: string;
  /** Faint separator for lists. */
  line: string;
  text: string;
  subtext: string;
  faint: string;

  // semantic
  expense: string;
  income: string;
  warn: string;
  risk: string;
  good: string;

  white: string;
}

export const lightColors: ThemeColors = {
  ocean900: '#0C2E44',
  ocean800: '#0D3B5C',
  ocean600: '#0A5C8C',
  ocean500: '#147BB0',
  aqua400: '#2FA3C7',
  aqua300: '#7CC3DC',
  sun500: '#C98A2C',
  sun300: '#E9C46A',
  ice50: '#EEF5F9',
  ice100: '#DCEBF4',

  bg: '#F6F1E6',
  card: '#FFFDF8',
  cardSolid: '#FFFDF8',
  glassBorder: 'rgba(30,44,60,0.14)',
  glassBorderSoft: 'rgba(30,44,60,0.09)',
  line: 'rgba(30,44,60,0.10)',
  text: '#1D2D3E',
  subtext: '#5C6C7B',
  faint: '#96A2AD',

  expense: '#C24D53',
  income: '#177E71',
  warn: '#C98A2C',
  risk: '#C24D53',
  good: '#177E71',

  white: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  ocean900: '#050D16',
  ocean800: '#0A1F30',
  ocean600: '#4E9ECB',
  ocean500: '#7BC0E3',
  aqua400: '#3C93B8',
  aqua300: '#79B9D2',
  sun500: '#E0A44E',
  sun300: '#EFCB83',
  ice50: 'rgba(233,239,244,0.06)',
  ice100: 'rgba(233,239,244,0.10)',

  bg: '#0A1520',
  card: '#122231',
  cardSolid: '#122231',
  glassBorder: 'rgba(151,183,214,0.16)',
  glassBorderSoft: 'rgba(151,183,214,0.10)',
  line: 'rgba(151,183,214,0.10)',
  text: '#E9EFF4',
  subtext: '#9EB0BF',
  faint: '#64788B',

  expense: '#E2838A',
  income: '#45B3A4',
  warn: '#E0A44E',
  risk: '#E2838A',
  good: '#45B3A4',

  white: '#FFFFFF',
};

export interface Palette {
  header: readonly [string, string, string];
  headerSoft: readonly [string, string, string];
  fab: readonly [string, string, string];
  income: readonly [string, string];
  expense: readonly [string, string];
  sheen: readonly [string, string];
}

export const gradientsLight: Palette = {
  header: ['#0C2E44', '#12486C', '#155B8A'],
  headerSoft: ['#0D3B5C', '#155B8A', '#1C6FA3'],
  fab: ['#0C2E44', '#0F5C86', '#147BB0'],
  income: ['#11675C', '#2AA797'],
  expense: ['#A83F45', '#D96A70'],
  sheen: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.01)'],
};

export const gradientsDark: Palette = {
  header: ['#040B14', '#0A1F30', '#123049'],
  headerSoft: ['#0A1F30', '#123049', '#1B4560'],
  fab: ['#0A1F30', '#1B5D86', '#2B7CA8'],
  income: ['#11675C', '#2AA797'],
  expense: ['#A83F45', '#D96A70'],
  sheen: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)'],
};

/** Backdrop spec used by <AuroraBackground /> — a calm paper + weave, no blobs. */
export const auroraLight = {
  sky: '#7CC3DC',
  aqua: '#A5D5E4',
  lagoon: '#8FCBB8',
  /** Warm dusk accent — the Manila-Bay golden hour. */
  glow: '#E9C46A',
  base: '#F6F1E6',
  /** Tint applied to the banig weave texture. */
  weave: '#B29B72',
  weaveOpacity: 0.10,
} as const;

export const auroraDark = {
  sky: '#12486C',
  aqua: '#0F5468',
  lagoon: '#0F6E68',
  glow: '#C98A2C',
  base: '#0A1520',
  weave: '#31506B',
  weaveOpacity: 0.12,
} as const;

export function gradientsFor(isDark: boolean): Palette {
  return isDark ? gradientsDark : gradientsLight;
}

export function auroraFor(isDark: boolean) {
  return isDark ? auroraDark : auroraLight;
}

/** Type ramp — Lora carries headings; Manrope carries UI & numbers. */
export const font = {
  /** Headings & page titles — warm editorial serif. */
  display: 'Lora_600SemiBold',
  /** Bold serif for wordmarks. */
  displayBold: 'Lora_700Bold',
  /** Emphasised labels & buttons */
  bold: 'Manrope_700Bold',
  /** Quiet emphasis */
  medium: 'Manrope_500Medium',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

/**
 * Shared surface recipe. Spread into any card style so every paper surface
 * picks up the same hairline edge treatment.
 */
export const glass = {
  surface: {
    borderWidth: 1,
  } as const,
};

export interface ShadowPalette {
  card: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
  cardHi: typeof shadow.cardHi;
  fab: typeof shadow.fab;
}

const shadowLight = {
  /** Resting paper card: close, directional, quiet. */
  card: {
    shadowColor: '#1C2936',
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  /** Hero cards (balance, safe-to-spend). */
  cardHi: {
    shadowColor: '#0C2E44',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  fab: {
    shadowColor: '#0A2D44',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

const shadowDark = {
  card: { ...shadowLight.card, shadowColor: '#000000', shadowOpacity: 0.34, elevation: 6 },
  cardHi: { ...shadowLight.cardHi, shadowColor: '#000000', shadowOpacity: 0.46, elevation: 9 },
  fab: { ...shadowLight.fab, shadowColor: '#000000', shadowOpacity: 0.5, elevation: 10 },
} as const;

/**
 * Real shadows on web/iOS PWA: react-native-web ignores the iOS shadow props,
 * so without `boxShadow` every card renders flat. Native platforms keep the
 * classic shadow props and ignore boxShadow.
 */
const webShadowsLight = {
  card: { boxShadow: '0 4px 14px rgba(28,41,54,0.09), 0 1px 3px rgba(28,41,54,0.06)' },
  cardHi: { boxShadow: '0 10px 28px rgba(12,46,68,0.15), 0 2px 6px rgba(12,46,68,0.08)' },
  fab: { boxShadow: '0 6px 16px rgba(10,45,68,0.28)' },
} as const;

const webShadowsDark = {
  card: { boxShadow: '0 4px 14px rgba(0,0,0,0.36), 0 1px 3px rgba(0,0,0,0.20)' },
  cardHi: { boxShadow: '0 10px 28px rgba(0,0,0,0.48), 0 2px 6px rgba(0,0,0,0.24)' },
  fab: { boxShadow: '0 6px 16px rgba(0,0,0,0.45)' },
} as const;

function withWeb<T extends object>(native: T, web: object): T {
  if (Platform.OS === 'web') {
    return { ...native, ...web } as T;
  }
  return native;
}

export function shadowFor(isDark: boolean) {
  const native = isDark ? shadowDark : shadowLight;
  const web = isDark ? webShadowsDark : webShadowsLight;
  return {
    card: withWeb(native.card, web.card),
    cardHi: withWeb(native.cardHi, web.cardHi),
    fab: withWeb(native.fab, web.fab),
  };
}

/** Legacy static (light-scheme) shadows for module-level StyleSheets.
 *  Prefer `useTheme().shadow` inside components for theme-aware shadows. */
export const shadow = {
  ...shadowLight,
  ...(Platform.OS === 'web' ? webShadowsLight : {}),
};

/**
 * Animated two-way color helper driven by the theme progress value
 * (0 = light, 1 = dark). Pass into an Animated style; the transition is
 * what makes switching themes feel alive.
 */
export function mix(
  progress: Animated.AnimatedInterpolation<number>,
  light: string,
  dark: string
): Animated.AnimatedInterpolation<string> {
  return progress.interpolate({ inputRange: [0, 1], outputRange: [light, dark] });
}

/** Legacy export — screens should use useTheme().t instead. Kept for safety. */
export const colors = lightColors;
