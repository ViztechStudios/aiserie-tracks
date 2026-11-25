/**
 * Aiserie Tracks v2.3.0 — "Fern & Bark" design system.
 *
 * One idea carries the whole app: a friendly ledger kept in a fern house —
 * deep jungle green, paper-white cards, and two small companions (a pup and
 * a tabby) who greet you on every page. Restraint does the rest:
 *
 *  - Cards are white and quiet; depth comes from hairlines and small,
 *    directional shadows — never from glow or sheen.
 *  - Fern ink (#0D3B27) is the only "brand surface": page headers and the
 *    primary action. One mango-gold accent (#D9A13B) marks focus, craft
 *    edges and the active tab. Nothing else competes for attention.
 *  - Type has a fixed voice: Lora (serif) for page titles only, Manrope
 *    everywhere else — Medium for body, Bold for labels and amounts,
 *    ExtraBold reserved for the single hero number on a screen.
 *  - The woven texture stays almost subliminal, so surfaces read as
 *    material rather than decoration.
 *
 * Light: fern paper / pine ink. Dark: jungle night / warm gold.
 * ThemeContext drives a 0->1 progress value so every surface cross-fades.
 */
import { Animated, Platform } from 'react-native';

export interface ThemeColors {
  // brand — fern + sun
  /** Deep pine — page headers, primary ink surfaces. */
  ocean900: string;
  ocean800: string;
  /** Primary action green — buttons, links, active marks. */
  ocean600: string;
  ocean500: string;
  /** Fresh leaf accents (chips, soft highlights). */
  aqua400: string;
  aqua300: string;
  /** Mango-gold accent — active tab mark, craft edges, warm highlights. */
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
  ocean900: '#0D3B27',
  ocean800: '#14503A',
  ocean600: '#1E7A50',
  ocean500: '#2E9B63',
  aqua400: '#58B98A',
  aqua300: '#9BD9B8',
  sun500: '#D9A13B',
  sun300: '#F0D492',
  goldWash: '#FBF3DF',
  ice50: '#F0F7F2',
  ice100: '#E3F0E7',

  bg: '#F4F8F1',
  card: '#FFFFFF',
  cardSolid: '#FFFFFF',
  glassBorder: 'rgba(19,54,36,0.14)',
  glassBorderSoft: 'rgba(19,54,36,0.08)',
  line: 'rgba(19,54,36,0.10)',
  text: '#16382A',
  subtext: '#5E7A6A',
  faint: '#93AFA0',

  expense: '#C14B55',
  income: '#1E8A5B',
  warn: '#D9A13B',
  risk: '#C14B55',
  good: '#1E8A5B',

  white: '#FFFFFF',
};

/**
 * Solid brand-green for filled buttons with white content — constant across
 * themes. The themed t.ocean600 flips light in dark mode for text/icons;
 * backgrounds need this fixed ink so white labels stay readable.
 */
export const brandFern = '#1E7A50';
/** Back-compat alias for older call sites. */
export const brandOcean = brandFern;

export const darkColors: ThemeColors = {
  ocean900: '#05130C',
  ocean800: '#0A2418',
  ocean600: '#6FCB97',
  ocean500: '#8FD9AE',
  aqua400: '#3F9B6C',
  aqua300: '#79B993',
  sun500: '#E5B95C',
  sun300: '#EFD492',
  goldWash: 'rgba(229,185,92,0.12)',
  ice50: 'rgba(240,247,242,0.06)',
  ice100: 'rgba(240,247,242,0.10)',

  bg: '#0A1912',
  card: '#112719',
  cardSolid: '#112719',
  glassBorder: 'rgba(157,196,175,0.16)',
  glassBorderSoft: 'rgba(157,196,175,0.10)',
  line: 'rgba(157,196,175,0.10)',
  text: '#E9F3EB',
  subtext: '#9DB8A7',
  faint: '#6B8577',

  expense: '#E8929C',
  income: '#57C98F',
  warn: '#E5B95C',
  risk: '#E8929C',
  good: '#57C98F',

  white: '#FFFFFF',
};

export interface Palette {
  header: readonly [string, string, string];
  headerSoft: readonly [string, string, string];
  /** Fern-house hero: soft mint top -> warm gold horizon bottom. */
  hero: readonly [string, string, string, string];
  fab: readonly [string, string];
  income: readonly [string, string];
  expense: readonly [string, string];
  sheen: readonly [string, string];
}

export const gradientsLight: Palette = {
  header: ['#0D3B27', '#14503A', '#1E7A50'],
  headerSoft: ['#14503A', '#1E7A50', '#2E9B63'],
  hero: ['#CFE9D6', '#E4F1E2', '#FBF3DF', '#F2DFAE'],
  fab: ['#0D3B27', '#1E7A50'],
  income: ['#1E8A5B', '#43AD7F'],
  expense: ['#C14B55', '#DB6E76'],
  sheen: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.01)'],
};

export const gradientsDark: Palette = {
  header: ['#03100A', '#082017', '#0D3222'],
  headerSoft: ['#082017', '#0D3222', '#144731'],
  hero: ['#071710', '#0A2016', '#0F2E1E', '#153D29'],
  fab: ['#082017', '#1E7A50'],
  income: ['#1E8A5B', '#43AD7F'],
  expense: ['#C14B55', '#DB6E76'],
  sheen: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'],
};

/** Backdrop spec used by <AuroraBackground /> — quiet paper + fine weave. */
export const auroraLight = {
  base: '#F4F8F1',
  /** Tint applied to the woven-paper texture. */
  weave: '#7FA98B',
  weaveOpacity: 0.07,
  /** Soft leaf-light at the top edge, kept faint. */
  glow: 'rgba(151,199,168,0.18)',
} as const;

export const auroraDark = {
  base: '#0A1912',
  weave: '#2E5240',
  weaveOpacity: 0.10,
  glow: 'rgba(229,185,92,0.06)',
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
    shadowColor: '#173B2A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  /** Hero cards (balance, safe-to-spend). */
  cardHi: {
    shadowColor: '#0D3B27',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  fab: {
    shadowColor: '#07291B',
    shadowOpacity: 0.26,
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
  card: { boxShadow: '0 2px 8px rgba(23,59,42,0.09)' },
  cardHi: { boxShadow: '0 6px 18px rgba(13,59,39,0.14)' },
  fab: { boxShadow: '0 4px 12px rgba(7,41,27,0.28)' },
} as const;

const webShadowsDark = {
  card: { boxShadow: '0 2px 8px rgba(0,0,0,0.30)' },
  cardHi: { boxShadow: '0 6px 18px rgba(0,0,0,0.42)' },
  fab: { boxShadow: '0 4px 12px rgba(0,0,0,0.40)' },
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
 *  Prefer `useTheme().shadow` inside components for theme-aware shadows.
 *  (Kept with token names for zero-churn call sites.) */
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
