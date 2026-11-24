import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';
import { MonthBar } from '../types';
import { formatCompact } from '../utils/money';

interface Props {
  months: MonthBar[];
  currency: string;
}

/** Income vs expense bars for the last 6 months (pure Views, no chart lib). */
export function BarChart({ months, currency }: Props) {
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1);
  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Last 6 months</Text>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: colors.income }]} />
          <Text style={styles.legendText}>Income</Text>
          <View style={[styles.dot, { backgroundColor: colors.expense, marginLeft: 10 }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>
      <View style={styles.chart}>
        {months.map((m) => (
          <View key={m.ym} style={styles.group}>
            <View style={styles.bars}>
              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max((m.income / max) * 110, m.income > 0 ? 4 : 0), backgroundColor: colors.income },
                  ]}
                />
              </View>
              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max((m.expense / max) * 110, m.expense > 0 ? 4 : 0), backgroundColor: colors.expense },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.monthLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        Peak month: {formatCompact(Math.max(...months.map((m) => m.expense), 0), currency)} spent
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  heading: { color: colors.text, fontWeight: '800', fontSize: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendText: { color: colors.subtext, fontSize: 11, marginLeft: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chart: { flexDirection: 'row', justifyContent: 'space-between' },
  group: { alignItems: 'center', flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 116 },
  barWrap: { width: 12, height: 112, justifyContent: 'flex-end', marginHorizontal: 2 },
  bar: { borderRadius: 6, width: '100%' },
  monthLabel: { color: colors.subtext, fontSize: 11, marginTop: 6 },
  note: { color: colors.faint, fontSize: 11, marginTop: spacing.sm },
});
