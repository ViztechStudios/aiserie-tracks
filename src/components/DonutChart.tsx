import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../store/ThemeContext';
import { font, radius, spacing } from '../theme';
import { CategoryTotal } from '../types';
import { formatCompact } from '../utils/money';

interface Props {
  data: CategoryTotal[];
  currency: string;
}

const SIZE = 176;
const STROKE = 24;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Category-share donut built with react-native-svg. */
export function DonutChart({ data, currency }: Props) {
  const { t, shadow } = useTheme();
  const total = data.reduce((s, d) => s + d.amount, 0);
  let offset = 0;
  const segments = data.slice(0, 6).map((d) => {
    const frac = total > 0 ? d.amount / total : 0;
    const seg = { ...d, dash: frac * C, offset };
    offset += frac * C;
    return seg;
  });

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorderSoft, borderWidth: 1 }, shadow.card]}>
      <Text style={[styles.heading, { color: t.text }]}>Where the money went</Text>
      <View style={styles.chartRow}>
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={t.ice100} strokeWidth={STROKE} fill="none" />
            {segments.map((s, i) => (
              <Circle
                key={s.category.id + i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={s.category.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${Math.max(s.dash - 2, 0)} ${C}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
                rotation="-90"
                originX={SIZE / 2}
                originY={SIZE / 2}
              />
            ))}
          </Svg>
          <View style={styles.center}>
            <Text style={[styles.totalLabel, { color: t.subtext }]}>Total</Text>
            <Text style={[styles.totalValue, { color: t.text }]}>{formatCompact(total, currency)}</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {segments.map((s, i) => (
            <View key={s.category.id + i} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.category.color }]} />
              <Text style={[styles.legendName, { color: t.text }]} numberOfLines={1}>
                {s.category.emoji} {s.category.label}
              </Text>
              <Text style={[styles.legendAmt, { color: t.subtext }]}>
                {total > 0 ? `${Math.round((s.amount / total) * 100)}%` : '0%'}
              </Text>
            </View>
          ))}
          {segments.length === 0 && <Text style={[styles.legendAmt, { color: t.subtext }]}>No spending yet</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heading: { fontFamily: font.bold, fontSize: 16, marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center' },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 18, fontFamily: font.bold },
  legend: { flex: 1, marginLeft: spacing.lg, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendName: { flex: 1, fontSize: 13 },
  legendAmt: { fontSize: 13, fontFamily: font.bold },
});
