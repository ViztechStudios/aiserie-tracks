import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { font, radius, spacing } from '../theme';
import { MonthBar } from '../types';
import { formatCompact } from '../utils/money';

interface Props {
  months: MonthBar[];
  currency: string;
}

/** One bar that grows from zero with a springy overshoot. */
function GrowBar({ target, color, delay }: { target: number; color: string; delay: number }) {
  const h = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    h.setValue(0);
    Animated.timing(h, {
      toValue: target,
      delay,
      duration: 620,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: false, // height is a layout prop
    }).start();
  }, [h, target, delay]);
  return <Animated.View style={[styles.bar, { height: h, backgroundColor: color }]} />;
}

/** Income vs expense bars for the last 6 months (pure Views, no chart lib). */
export function BarChart({ months, currency }: Props) {
  const { t, shadow } = useTheme();
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1);
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorderSoft, borderWidth: 1 }, shadow.card]}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: t.text }]}>Last 6 months</Text>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: t.income }]} />
          <Text style={[styles.legendText, { color: t.subtext }]}>Income</Text>
          <View style={[styles.dot, { backgroundColor: t.expense, marginLeft: 10 }]} />
          <Text style={[styles.legendText, { color: t.subtext }]}>Expense</Text>
        </View>
      </View>
      <View style={styles.chart}>
        {months.map((m, i) => (
          <View key={m.ym} style={styles.group}>
            <View style={styles.bars}>
              <View style={styles.barWrap}>
                <GrowBar
                  target={Math.max((m.income / max) * 110, m.income > 0 ? 4 : 0)}
                  color={t.income}
                  delay={80 + i * 70}
                />
              </View>
              <View style={styles.barWrap}>
                <GrowBar
                  target={Math.max((m.expense / max) * 110, m.expense > 0 ? 4 : 0)}
                  color={t.expense}
                  delay={115 + i * 70}
                />
              </View>
            </View>
            <Text style={[styles.monthLabel, { color: t.subtext }]}>{m.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.note, { color: t.faint }]}>
        Peak month: {formatCompact(Math.max(...months.map((m) => m.expense), 0), currency)} spent
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  heading: { fontFamily: font.bold, fontSize: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendText: { fontSize: 11, marginLeft: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chart: { flexDirection: 'row', justifyContent: 'space-between' },
  group: { alignItems: 'center', flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 116 },
  barWrap: { width: 12, height: 112, justifyContent: 'flex-end', marginHorizontal: 2 },
  bar: { borderRadius: 6, width: '100%' },
  monthLabel: { fontSize: 11, marginTop: 6 },
  note: { fontSize: 11, marginTop: spacing.sm },
});
