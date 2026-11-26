import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { font, spacing } from '../theme';
import { formatMoney } from '../utils/money';
import { AnimatedNumber } from './AnimatedNumber';

/**
 * The Income / Expenses summary pair shown under the month chips — two white
 * paper cards with a tinted icon tile, matching the reference layout.
 */
export function MonthSummary({ income, expense, currency }: { income: number; expense: number; currency: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.card, { backgroundColor: t.card }]}>
        <View style={[styles.tile, { backgroundColor: 'rgba(30,122,108,0.12)' }]}>
          <Ionicons name="trending-up" size={17} color={t.income} />
        </View>
        <View style={styles.mid}>
          <Text style={[styles.label, { color: t.subtext }]}>INCOME</Text>
          <AnimatedNumber
            value={income}
            flash="auto"
            restingColor={t.text}
            style={[styles.amount, { color: t.text }]}
            format={(n) => formatMoney(n, currency)}
          />
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: t.card }]}>
        <View style={[styles.tile, { backgroundColor: 'rgba(185,74,82,0.12)' }]}>
          <Ionicons name="trending-down" size={17} color={t.expense} />
        </View>
        <View style={styles.mid}>
          <Text style={[styles.label, { color: t.subtext }]}>EXPENSES</Text>
          <AnimatedNumber
            value={expense}
            flash="auto"
            restingColor={t.text}
            style={[styles.amount, { color: t.text }]}
            format={(n) => formatMoney(n, currency)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1 },
  label: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.2 },
  amount: { fontFamily: font.heavy, fontSize: 16, marginTop: 2 },
});
