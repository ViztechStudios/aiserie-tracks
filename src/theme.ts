/**
 * Aiserie Tracks — Ocean Gradient design system.
 * Light-blue palette: deep ocean -> sky -> aqua.
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
  bg: '#F2F9FE',
  card: '#FFFFFF',
  text: '#0B3954',
  subtext: '#5E7C96',
  faint: '#9FB6C9',
  line: '#DCEBF7',

  // semantic
  expense: '#F45B69',
  income: '#16B8A0',
  warn: '#F5A524',
  risk: '#EF4444',
  good: '#12B76A',

  white: '#FFFFFF',
};

export const gradients = {
  header: ['#0B4F8A', '#0EA5E9', '#34CFEA'] as const,
  fab: ['#0B4F8A', '#0EA5E9', '#67E8F9'] as const,
  income: ['#0E9F8C', '#34D3BE'] as const,
  expense: ['#E24C5B', '#FB8A98'] as const,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
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

export const shadow = {
  card: {
    shadowColor: '#0B4F8A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  fab: {
    shadowColor: '#0B4F8A',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;
