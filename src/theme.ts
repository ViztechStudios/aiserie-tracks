/**
 * Aiserie Tracks v2.0.0 — Ocean Glass design system, light + dark.
 * Light: deep ocean -> sky -> aqua, wrapped in frosted glass.
 * Dark: midnight navy glass with glowing sky-blue accents.
 * ThemeContext drives a 0->1 progress value so every surface cross-fades.
 */
import { Animated, Platform } from 'react-native';

export interface ThemeColors {
  // brand
  ocean900: string;
  ocean800: string;
  ocean600: string;
  ocean500: string;
  aqua400: string;
  aqua300: string;
  ice50: string;
  ice100: string;

  // surfaces & text
  bg: string;
  /** Frosted glass surface (translucent so the aurora wash glows through). */
  card: string;
  /** Fully opaque surface, for sheets that must stay readable. */
  cardSolid: string;
  /** Hairline that catches light on a glass edge. */
  glassBorder: string;
  glassBorderSoft: string;
  /** Faint ocean-tinted separator for lists on glass. */
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
  ocean900: '#0A3D66',
  ocean800: '#0B4F8A',
  ocean600: '#0EA5E9',
  ocean500: '#38BDF8',
  aqua400: '#22D3EE',
  aqua300: '#67E8F9',
  ice50: '#F0F9FF',
  ice100: '#E0F2FE',

  bg: '#EFF7FD',
  card: 'rgba(255,255,255,0.74)',
  cardSolid: '#FFFFFF',
  glassBorder: 'rgba(255,255,255,0.85)',
  glassBorderSoft: 'rgba(255,255,255,0.55)',
  line: 'rgba(14,77,130,0.10)',
  text: '#0B3954',
  subtext: '#5E7C96',
  faint: '#93ACBF',

  expense: '#F45B69',
  income: '#16B8A0',
  warn: '#F5A524',
  risk: '#EF4444',
  good: '#12B76A',

  white: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  ocean900: '#0C4A6E',
  ocean800: '#A5D8FA',
  ocean600: '#38BDF8',
  ocean500: '#7DD3FC',
  aqua400: '#22D3EE',
  aqua300: '#67E8F9',
  ice50: 'rgba(255,255,255,0.07)',
  ice100: 'rgba(255,255,255,0.11)',

  bg: '#071528',
  card: 'rgba(38, 74, 128, 0.42)',
  cardSolid: '#0E2140',
  glassBorder: 'rgba(125,211,252,0.30)',
  glassBorderSoft: 'rgba(125,211,252,0.16)',
  line: 'rgba(125,211,252,0.12)',
  text: '#EAF4FF',
  subtext: '#9FB8D9',
  faint: '#6E8CAD',

  expense: '#FB7185',
  income: '#2DD4BF',
  warn: '#FBBF24',
  risk: '#F87171',
  good: '#34D399',

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
  header: ['#072F52', '#0B4F8A', '#0EA5E9'],
  headerSoft: ['#0B4F8A', '#0EA5E9', '#34CFEA'],
  fab: ['#072F52', '#0EA5E9', '#67E8F9'],
  income: ['#0E9F8C', '#34D3BE'],
  expense: ['#E24C5B', '#FB8A98'],
  sheen: ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.02)'],
};

export const gradientsDark: Palette = {
  header: ['#030B18', '#0A2440', '#114A6E'],
  headerSoft: ['#0A2440', '#114A6E', '#1B6E8F'],
  fab: ['#0C4A6E', '#0EA5E9', '#7DD3FC'],
  income: ['#0E9F8C', '#34D3BE'],
  expense: ['#E24C5B', '#FB8A98'],
  sheen: ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.01)'],
};

/** Decorative colour wash used by <AuroraBackground /> behind every screen. */
export const auroraLight = {
  sky: '#7DD3FC',
  aqua: '#A5F3FC',
  lagoon: '#6EE7D8',
  /** Warm dusk accent — the Manila-Bay sunset glow on the horizon. */
  glow: '#F6C273',
  base: '#EFF7FD',
} as const;

export const auroraDark = {
  sky: '#0E7DB8',
  aqua: '#0E7490',
  lagoon: '#0F6E68',
  glow: '#C77E3A',
  base: '#071528',
} as const;

export function gradientsFor(isDark: boolean): Palette {
  return isDark ? gradientsDark : gradientsLight;
}

export function auroraFor(isDark: boolean) {
  return isDark ? auroraDark : auroraLight;
}

/** Type ramp — Manrope gives the app a designed, human voice. */
export const font = {
  /** Headings & hero numbers */
  display: 'Manrope_800ExtraBold',
  /** Emphasised labels & buttons */
  bold: 'Manrope_700Bold',
  /** Quiet emphasis */
  medium: 'Manrope_500Medium',
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
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
 * Shared glass surface recipe. Spread into any card style so every surface
 * picks up the same frosted edge treatment. Colors animate via GlassCard;
 * when used directly prefer mix(progress, ...) for the fill/border.
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
  /** Resting card: large, soft, ocean-tinted. */
  card: {
    shadowColor: '#0B4F8A',
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  /** Hero cards (balance, safe-to-spend). */
  cardHi: {
    shadowColor: '#072F52',
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  fab: {
    shadowColor: '#072F52',
    shadowOpacity: 0.40,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
} as const;

const shadowDark = {
  card: { ...shadowLight.card, shadowColor: '#000000', shadowOpacity: 0.36, elevation: 7 },
  cardHi: { ...shadowLight.cardHi, shadowColor: '#000000', shadowOpacity: 0.46, elevation: 10 },
  fab: { ...shadowLight.fab, shadowColor: '#000000', shadowOpacity: 0.55, elevation: 12 },
} as const;

/**
 * Real shadows on web/iOS PWA: react-native-web ignores the iOS shadow props,
 * so without `boxShadow` every card renders flat (the generic "AI look").
 * Native platforms keep the classic shadow props and ignore boxShadow.
 */
const webShadowsLight = {
  card: { boxShadow: '0 10px 30px rgba(7,47,82,0.13), 0 2px 6px rgba(7,47,82,0.07)' },
  cardHi: { boxShadow: '0 18px 44px rgba(7,47,82,0.20), 0 4px 10px rgba(7,47,82,0.10)' },
  fab: { boxShadow: '0 12px 28px rgba(7,47,82,0.34)' },
} as const;

const webShadowsDark = {
  card: { boxShadow: '0 10px 30px rgba(0,0,0,0.42), 0 2px 6px rgba(0,0,0,0.24)' },
  cardHi: { boxShadow: '0 18px 44px rgba(0,0,0,0.52), 0 4px 10px rgba(0,0,0,0.28)' },
  fab: { boxShadow: '0 12px 28px rgba(0,0,0,0.55)' },
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
