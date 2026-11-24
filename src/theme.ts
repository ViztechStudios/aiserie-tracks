/**
 * Aiserie Tracks v2.1.0 — "Capiz & Ink" design system.
 *
 * One idea carries the whole app: a hand-kept ledger on capiz-paper, bound
 * in sea ink, ruled in gold. Everything else is restraint:
 *
 *  - Paper surfaces are white and quiet; depth comes from hairlines and
 *    small, directional shadows — never from glow or sheen.
 *  - Sea ink (#0C2E44) is the only "brand surface": page headers and the
 *    primary action. One gold accent (#C08A32) marks focus, craft edges
 *    and the active tab. Nothing else competes for attention.
 *  - Type has a fixed voice: Lora (serif) for page titles only, Manrope
 *    everywhere else — Medium for body, Bold for labels and amounts,
 *    ExtraBold reserved for the single hero number on a screen.
 *  - The woven-paper texture is present but almost subliminal, so surfaces
 *    read as material rather than decoration.
 *
 * Light: capiz paper / sea ink. Dark: midnight ink / warm gold.
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
  /** Golden-hour accent — active tab mark, craft edges, warm highlights. */
  sun500: string;
  sun300: string;
  /** Soft gold wash for tonal (secondary) buttons. */
  goldWash: string;
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
  ocean800: '#10496F',
  ocean600: '#0B5C8A',
  ocean500: '#2A7FAD',
  aqua400: '#4AA3C4',
  aqua300: '#8FC6DB',
  sun500: '#C08A32',
  sun300: '#E5C87E',
  goldWash: '#F6ECD7',
  ice50: '#EFF5F8',
  ice100: '#E1EDF4',

  bg: '#F7F3EA',
  card: '#FFFFFF',
  cardSolid: '#FFFFFF',
  glassBorder: 'rgba(26,43,60,0.14)',
  glassBorderSoft: 'rgba(26,43,60,0.08)',
  line: 'rgba(26,43,60,0.10)',
  text: '#1A2B3C',
  subtext: '#5D6E7D',
  faint: '#93A3B1',

  expense: '#B94A52',
  income: '#1E7A6C',
  warn: '#C08A32',
  risk: '#B94A52',
  good: '#1E7A6C',

  white: '#FFFFFF',
};

/**
 * Solid brand-blue for filled buttons with white content — constant across
 * themes. The themed t.ocean600 flips light in dark mode for text/icons;
 * backgrounds need this fixed ink so white labels stay readable.
 */
export const brandOcean = '#0B5C8A';

export const darkColors: ThemeColors = {
  ocean900: '#050E18',
  ocean800: '#0A2135',
  ocean600: '#6FB5DB',
  ocean500: '#8FC6DB',
  aqua400: '#3E90B5',
  aqua300: '#79B9D2',
  sun500: '#E0A94E',
  sun300: '#EFCB83',
  goldWash: 'rgba(224,169,78,0.12)',
  ice50: 'rgba(233,239,244,0.06)',
  ice100: 'rgba(233,239,244,0.10)',

  bg: '#0B1520',
  card: '#13222F',
  cardSolid: '#13222F',
  glassBorder: 'rgba(151,183,214,0.16)',
  glassBorderSoft: 'rgba(151,183,214,0.10)',
  line: 'rgba(151,183,214,0.10)',
  text: '#E7EDF3',
  subtext: '#9BB0BF',
  faint: '#65798B',

  expense: '#E2878D',
  income: '#4CB4A3',
  warn: '#E0A94E',
  risk: '#E2878D',
  good: '#4CB4A3',

  white: '#FFFFFF',
};

export interface Palette {
  header: readonly [string, string, string];
  headerSoft: readonly [string, string, string];
  fab: readonly [string, string];
  income: readonly [string, string];
  expense: readonly [string, string];
  sheen: readonly [string, string];
}

export const gradientsLight: Palette = {
  header: ['#0C2E44', '#114A70', '#175F8C'],
  headerSoft: ['#10496F', '#175F8C', '#1E709F'],
  fab: ['#0C2E44', '#0B5C8A'],
  income: ['#1E7A6C', '#3BA693'],
  expense: ['#B94A52', '#D96A70'],
  sheen: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.01)'],
};

export const gradientsDark: Palette = {
  header: ['#040C16', '#0A1F30', '#0F2D44'],
  headerSoft: ['#0A1F30', '#0F2D44', '#173E59'],
  fab: ['#0A1F30', '#2A7FAD'],
  income: ['#1E7A6C', '#3BA693'],
  expense: ['#B94A52', '#D96A70'],
  sheen: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'],
};

/** Backdrop spec used by <AuroraBackground /> — quiet paper + fine weave. */
export const auroraLight = {
  base: '#F7F3EA',
  /** Tint applied to the woven-paper texture. */
  weave: '#B29B72',
  weaveOpacity: 0.07,
  /** Warm top light — the Manila-Bay golden hour, kept faint. */
  glow: 'rgba(229,200,126,0.20)',
} as const;

export const auroraDark = {
  base: '#0B1520',
  weave: '#31506B',
  weaveOpacity: 0.10,
  glow: 'rgba(224,169,78,0.06)',
} as const;

export function gradientsFor(isDark: boolean): Palette {
  return isDark ? gradientsDark : gradientsLight;
}

export function auroraFor(isDark: boolean) {
  return isDark ? auroraDark : auroraLight;
}

/**
 * Type ramp — Lora carries page titles; Manrope carries everything else.
 * These tokens are the single source of truth: no bare fontWeight without
 * a matching family, or the OS font sneaks in and the voice falls apart.
 */
export const font = {
  /** Page titles — warm editorial serif, used sparingly. */
  display: 'Lora_600SemiBold',
  /** Boot-screen wordmark. */
  displayBold: 'Lora_700Bold',
  /** Hero numbers only (one per screen). */
  heavy: 'Manrope_800ExtraBold',
  /** Buttons, row titles, amounts, section labels. */
  bold: 'Manrope_700Bold',
  /** Body copy, captions, quiet labels. */
  medium: 'Manrope_500Medium',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
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
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  /** Hero cards (balance, safe-to-spend). */
  cardHi: {
    shadowColor: '#0C2E44',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  fab: {
    shadowColor: '#0A2D44',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

const shadowDark = {
  card: { ...shadowLight.card, shadowColor: '#000000', shadowOpacity: 0.30, elevation: 4 },
  cardHi: { ...shadowLight.cardHi, shadowColor: '#000000', shadowOpacity: 0.42, elevation: 7 },
  fab: { ...shadowLight.fab, shadowColor: '#000000', shadowOpacity: 0.45, elevation: 8 },
} as const;

/**
 * Real shadows on web/iOS PWA: react-native-web ignores the iOS shadow props,
 * so without `boxShadow` every card renders flat. Native platforms keep the
 * classic shadow props and ignore boxShadow.
 */
const webShadowsLight = {
  card: { boxShadow: '0 3px 10px rgba(28,41,54,0.07), 0 1px 2px rgba(28,41,54,0.05)' },
  cardHi: { boxShadow: '0 8px 22px rgba(12,46,68,0.13), 0 2px 5px rgba(12,46,68,0.07)' },
  fab: { boxShadow: '0 5px 14px rgba(10,45,68,0.24)' },
} as const;

const webShadowsDark = {
  card: { boxShadow: '0 3px 10px rgba(0,0,0,0.32), 0 1px 2px rgba(0,0,0,0.18)' },
  cardHi: { boxShadow: '0 8px 22px rgba(0,0,0,0.44), 0 2px 5px rgba(0,0,0,0.22)' },
  fab: { boxShadow: '0 5px 14px rgba(0,0,0,0.42)' },
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
