/**
 * Aiserie Tracks — Ocean Glass design system.
 * Light-blue palette: deep ocean -> sky -> aqua, wrapped in frosted glass.
 */
export const colors = {
  // brand
  ocean900: '#0A3D66',
  ocean800: '#0B4F8A',
  ocean600: '#0EA5E9',
  ocean500: '#38BDF8',
  aqua400: '#22D3EE',
  aqua300: '#67E8F9',
  ice50: '#F0F9FF',
  ice100: '#E0F2FE',

  // surfaces & text
  bg: '#EFF7FD',
  /** Frosted glass surface (translucent so the aurora wash glows through). */
  card: 'rgba(255,255,255,0.74)',
  /** Fully opaque white, for sheets that must stay readable. */
  cardSolid: '#FFFFFF',
  /** Hairline that catches light on a glass edge. */
  glassBorder: 'rgba(255,255,255,0.85)',
  glassBorderSoft: 'rgba(255,255,255,0.55)',
  /** Faint ocean-tinted separator for lists on glass. */
  line: 'rgba(14,77,130,0.10)',
  text: '#0B3954',
  subtext: '#5E7C96',
  faint: '#93ACBF',

  // semantic
  expense: '#F45B69',
  income: '#16B8A0',
  warn: '#F5A524',
  risk: '#EF4444',
  good: '#12B76A',

  white: '#FFFFFF',
};

export const gradients = {
  header: ['#072F52', '#0B4F8A', '#0EA5E9'] as const,
  headerSoft: ['#0B4F8A', '#0EA5E9', '#34CFEA'] as const,
  fab: ['#072F52', '#0EA5E9', '#67E8F9'] as const,
  income: ['#0E9F8C', '#34D3BE'] as const,
  expense: ['#E24C5B', '#FB8A98'] as const,
  sheen: ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.02)'] as const,
};

/** Decorative colour wash used by <AuroraBackground /> behind every screen. */
export const aurora = {
  sky: '#7DD3FC',
  aqua: '#A5F3FC',
  lagoon: '#6EE7D8',
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
 * picks up the same frosted edge treatment.
 */
export const glass = {
  surface: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  } as const,
};

export const shadow = {
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
