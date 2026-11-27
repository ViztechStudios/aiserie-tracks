import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { font, spacing } from '../theme';
import { PressableScale } from './PressableScale';

/**
 * Horizontal month chips — "NOV 26, DEC 26 …" — the month selector used on
 * the Balance and Calendar pages. The strip runs from a few months back to
 * about a year ahead, and the selected month renders as a solid pill.
 */
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface MonthChipOption {
  ym: string; // 'YYYY-MM'
  label: string;
}

export function buildMonthOptions(current: string, back = 2, forward = 15): MonthChipOption[] {
  const [y, m] = current.split('-').map((n) => parseInt(n, 10));
  const options: MonthChipOption[] = [];
  for (let off = -back; off <= forward; off++) {
    const d = new Date(y, m - 1 + off, 1);
    const yy = d.getFullYear() % 100;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ ym, label: `${MONTHS_SHORT[d.getMonth()]} ${yy}` });
  }
  return options;
}

export function MonthChips({
  ym,
  onChange,
  variant = 'default',
}: {
  ym: string;
  onChange: (ym: string) => void;
  /** 'onGreen' renders for the deep fern header (white pills, green ink). */
  variant?: 'default' | 'onGreen';
}) {
  const { t, isDark } = useTheme();
  const options = useMemo(() => buildMonthOptions(currentMonth()), []);
  const onGreen = variant === 'onGreen';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {options.map((opt) => {
        const on = opt.ym === ym;
        return (
          <PressableScale
            key={opt.ym}
            onPress={() => onChange(opt.ym)}
            scaleTo={0.93}
            style={[
              styles.chip,
              {
                backgroundColor: on
                  ? isDark
                    ? t.sun500
                    : '#0D3B27'
                  : isDark
                    ? 'rgba(255,255,255,0.10)'
                    : 'rgba(19,54,36,0.08)',
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: on
                    ? isDark
                      ? '#05130C'
                      : '#FFFFFF'
                    : isDark
                      ? t.subtext
                      : '#4E6A5B',
                },
              ]}
            >
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -spacing.xl },
  row: { paddingHorizontal: spacing.xl, gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
