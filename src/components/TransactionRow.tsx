import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { font, radius, spacing } from '../theme';
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
  const { t } = useTheme();
  return (
    <PressableScale
      style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft, borderWidth: 1 }]}
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.975}
    >
      <View style={[styles.icon, { backgroundColor: category.color + '1E' }]}>
        <Text style={styles.emoji}>{category.emoji}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
          {note ? note : category.label}
        </Text>
        <Text style={[styles.sub, { color: t.subtext }]} numberOfLines={1}>
          {category.label} · {dayLabel(date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: type === 'income' ? t.income : t.expense }]}>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emoji: { fontSize: 19 },
  mid: { flex: 1, marginRight: spacing.sm },
  label: { fontFamily: font.bold, fontSize: 14.5 },
  sub: { fontFamily: font.medium, fontSize: 12, marginTop: 2 },
  amount: { fontFamily: font.bold, fontSize: 14.5 },
});
