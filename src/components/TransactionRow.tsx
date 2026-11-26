import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { useFinance } from '../store/FinanceContext';
import { font, radius, spacing } from '../theme';
import { Category, Transaction } from '../types';
import { formatMoney } from '../utils/money';
import { dayLabel } from '../utils/stats';
import { PressableScale } from './PressableScale';

interface Props {
  category: Category;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  date: string;
  note?: string;
  currency: string;
  /** Full transaction — used to render transfer from → to labels. */
  tx?: Transaction;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function TransactionRow({ category, amount, type, date, note, currency, tx, onPress, onLongPress }: Props) {
  const { t } = useTheme();
  const finance = useFinance();
  const income = type === 'income';
  const transfer = type === 'transfer';

  const fromName = finance.accounts.find((a) => a.id === tx?.accountId)?.name ?? 'Wallet';
  const toName = finance.accounts.find((a) => a.id === tx?.toAccountId)?.name ?? 'Wallet';

  const tint = income ? t.income : transfer ? t.ocean600 : t.expense;
  const bg = income ? t.income + '12' : transfer ? t.ocean600 + '12' : t.card;
  const border = income ? t.income + '3A' : transfer ? t.ocean600 + '3A' : t.glassBorderSoft;

  return (
    <PressableScale
      style={[
        styles.row,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.975}
    >
      <View style={[styles.icon, { backgroundColor: category.color + '1E' }]}>
        <Text style={styles.emoji}>{category.emoji}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
          {transfer ? `${fromName} → ${toName}` : note ? note : category.label}
        </Text>
        <Text style={[styles.sub, { color: t.subtext }]} numberOfLines={1}>
          {transfer ? `Transfer · ${dayLabel(date)}` : `${category.label} · ${dayLabel(date)}`}
        </Text>
      </View>
      <Text style={[styles.amount, { color: tint }]}>
        {income ? '+' : transfer ? '' : '−'}
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
