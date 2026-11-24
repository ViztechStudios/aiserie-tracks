import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

export interface Responsive {
  isTablet: boolean;
  isLandscape: boolean;
  /** Max width for centered content columns (undefined = full width on phones). */
  contentWidth?: number;
  /** Max width for bottom sheets / modals. */
  sheetWidth?: number;
}

/** Unified phone + tablet sizing. Tablets get a comfortable centered column. */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const shortest = Math.min(width, height);
    const isTablet = shortest >= 600;
    return {
      isTablet,
      isLandscape: width > height,
      contentWidth: isTablet ? 620 : undefined,
      sheetWidth: isTablet ? 520 : undefined,
    };
  }, [width, height]);
}
