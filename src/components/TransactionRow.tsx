import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../theme';
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
  /** Resolved palette — passed in instead of subscribed, so the row can be
   *  memoized (v4.2.0: every row used to re-render on ANY ledger change). */
  t: ThemeColors;
  /** Full transaction — used to render transfer from → to labels. */
  tx?: Transaction;
  fromName?: string;
  toName?: string;
  /** v4.2.0: id-based callbacks keep a stable identity across renders so
   *  React.memo on the row actually skips re-renders. */
  onPressTxId?: (id: string) => void;
  onLongPressTxId?: (id: string) => void;
}

function TransactionRowBase({ category, amount, type, date, note, currency, t, tx, fromName, toName, onPressTxId, onLongPressTxId }: Props) {
  const income = type === 'income';
  const transfer = type === 'transfer';

  const from = fromName ?? 'Wallet';
  const to = toName ?? 'Wallet';

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
      onPress={onPressTxId && tx ? () => onPressTxId(tx.id) : undefined}
      onLongPress={onLongPressTxId && tx ? () => onLongPressTxId(tx.id) : undefined}
      scaleTo={0.975}
    >
      <View style={[styles.icon, { backgroundColor: category.color + '1E' }]}>
        <Text style={styles.emoji}>{category.emoji}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
          {transfer ? `${from} → ${to}` : note ? note : category.label}
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

/**
 * Memoized ledger row. It reads NO context: everything that can change comes
 * through props, so an unrelated balance edit no longer re-renders every row
 * of the ledger (the v4.1.0 hot path).
 */
export const TransactionRow = React.memo(TransactionRowBase);

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
