import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, glass, radius, shadow, spacing } from '../theme';
import { Category } from '../types';
import { formatMoney } from '../utils/money';
import { dayLabel } from '../utils/stats';
import { PressableScale } from './PressableScale';

interface Props {
  category: Category;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  note?: string;
  currency: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function TransactionRow({ category, amount, type, date, note, currency, onPress, onLongPress }: Props) {
  return (
    <PressableScale
      style={[styles.row, glass.surface, shadow.card]}
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.975}
    >
      <View style={[styles.icon, { backgroundColor: category.color + '22' }]}>
        <Text style={styles.emoji}>{category.emoji}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.label} numberOfLines={1}>
          {note ? note : category.label}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {category.label} · {dayLabel(date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: type === 'income' ? colors.income : colors.expense }]}>
        {type === 'income' ? '+' : '−'}
        {formatMoney(amount, currency)}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md + 2,
    marginBottom: spacing.sm + 2,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emoji: { fontSize: 20 },
  mid: { flex: 1, marginRight: spacing.sm },
  label: { color: colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  amount: { fontWeight: '800', fontSize: 15 },
});
