import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, radius, shadow, spacing } from '../theme';
import { CategoryTotal } from '../types';
import { formatCompact, formatMoney } from '../utils/money';

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
  const total = data.reduce((s, d) => s + d.amount, 0);
  let offset = 0;
  const segments = data.slice(0, 6).map((d) => {
    const frac = total > 0 ? d.amount / total : 0;
    const seg = { ...d, dash: frac * C, offset };
    offset += frac * C;
    return seg;
  });

  return (
    <View style={[styles.card, shadow.card]}>
      <Text style={styles.heading}>Where the money went</Text>
      <View style={styles.chartRow}>
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.ice100} strokeWidth={STROKE} fill="none" />
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
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCompact(total, currency)}</Text>
          </View>
        </View>
        <View style={styles.legend}>
          {segments.map((s, i) => (
            <View key={s.category.id + i} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.category.color }]} />
              <Text style={styles.legendName} numberOfLines={1}>
                {s.category.emoji} {s.category.label}
              </Text>
              <Text style={styles.legendAmt}>
                {total > 0 ? `${Math.round((s.amount / total) * 100)}%` : '0%'}
              </Text>
            </View>
          ))}
          {segments.length === 0 && <Text style={styles.legendAmt}>No spending yet</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heading: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center' },
  totalLabel: { color: colors.subtext, fontSize: 12 },
  totalValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  legend: { flex: 1, marginLeft: spacing.lg, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendName: { flex: 1, color: colors.text, fontSize: 13 },
  legendAmt: { color: colors.subtext, fontSize: 13, fontWeight: '700' },
});
