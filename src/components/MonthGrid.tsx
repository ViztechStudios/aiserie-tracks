import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { font, spacing } from '../theme';
import { Transaction } from '../types';
import { PressableScale } from './PressableScale';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  ym: string;
  transactions: Transaction[];
  selectedDay: string | null;
  onSelectDay: (iso: string | null) => void;
}

function parseISO(date: string): Date {
  const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

/**
 * Compact month calendar: weekday letters, day numbers, up to two marker
 * dots per day (income teal / expense rose), today outlined, selected day
 * filled. Tap a day to focus the ledger on it; tap again to clear.
 */
export function MonthGrid({ ym, transactions, selectedDay, onSelectDay }: Props) {
  const { t, isDark } = useTheme();

  const [year, month] = ym.split('-').map((n) => parseInt(n, 10));
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const markers = useMemo(() => {
    const map: Record<string, { income: boolean; expense: boolean }> = {};
    for (const tx of transactions) {
      const day = tx.date.slice(0, 10);
      const entry = map[day] ?? { income: false, expense: false };
      if (tx.type === 'income') entry.income = true;
      else entry.expense = true;
      map[day] = entry;
    }
    return map;
  }, [transactions]);

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
      <View style={styles.weekRow}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={`h${i}`} style={[styles.letter, { color: t.faint }]}>
            {l}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={`r${r}`} style={styles.weekRow}>
          {cells.slice(r * 7, r * 7 + 7).map((iso, c) => {
            if (!iso) return <View key={`e${r}-${c}`} style={styles.cell} />;
            const day = parseInt(iso.slice(8), 10);
            const mark = markers[iso];
            const selected = iso === selectedDay;
            const today = iso === todayISO;
            return (
              <PressableScale
                key={iso}
                onPress={() => onSelectDay(selected ? null : iso)}
                scaleTo={0.86}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.dayNum,
                    selected && { backgroundColor: isDark ? t.sun500 : '#0D3B27' },
                    today && !selected && { borderWidth: 1.5, borderColor: t.sun500 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: selected
                          ? isDark
                            ? '#05130C'
                            : '#FFFFFF'
                          : today
                            ? t.text
                            : t.subtext,
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {mark?.income ? <View style={[styles.dot, { backgroundColor: t.income }]} /> : null}
                  {mark?.expense ? <View style={[styles.dot, { backgroundColor: t.expense }]} /> : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  weekRow: { flexDirection: 'row' },
  letter: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.bold,
    fontSize: 10.5,
    paddingVertical: 6,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: font.bold, fontSize: 12.5 },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
