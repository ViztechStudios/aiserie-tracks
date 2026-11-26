import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { font, spacing } from '../theme';
import { Transaction } from '../types';
import { getCategory } from '../data/categories';
import { formatMoney } from '../utils/money';
import { groupByDay } from '../utils/stats';
import { TransactionRow } from './TransactionRow';
import { EmptyState } from './EmptyState';
import { PressableScale } from './PressableScale';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  ym: string;
  transactions: Transaction[];
  currency: string;
  onPressTx?: (tx: Transaction) => void;
  onLongPressTx?: (tx: Transaction) => void;
  /** ISO date — when set, only that day is listed. */
  dayFilter?: string | null;
  onClearDay?: () => void;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyTitle?: string;
  emptyBody?: string;
}

interface DayGroup {
  date: string;
  items: Transaction[];
  income: number;
  expense: number;
}

function parseISO(date: string): Date {
  const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function dayTitle(date: string): string {
  const d = parseISO(date);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}, ${DAY_NAMES[d.getDay()]}`;
}

function weekLabel(date: string): string {
  const d = parseISO(date);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay()); // Sunday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const s = `${start.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
  const e = sameMonth && sameYear ? `${end.getDate()}` : `${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
  return `${s}\u2013${e}`;
}

/**
 * The day-by-day ledger used on the Balance and Calendar pages: a centered
 * month pill, week ranges, day headers with running totals, and tinted
 * transaction rows.
 */
export function MonthTxList({
  ym,
  transactions,
  currency,
  onPressTx,
  onLongPressTx,
  dayFilter,
  onClearDay,
  emptyIcon = 'calendar-outline',
  emptyTitle = 'Nothing logged this month',
  emptyBody = 'Tap the + button to record your first transaction for this month.',
}: Props) {
  const { t } = useTheme();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');

  const filtered = useMemo(() => {
    if (dayFilter) return transactions;
    const q = query.trim().toLowerCase();
    if (!q && kind === 'all') return transactions;
    return transactions.filter((tx) => {
      if (kind !== 'all' && tx.type !== kind) return false;
      if (!q) return true;
      const cat = getCategory(tx.categoryId);
      const hay = `${tx.note ?? ''} ${cat?.label ?? ''} ${tx.amount}`.toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, query, kind, dayFilter]);

  const groups = useMemo<DayGroup[]>(() => {
    const all = groupByDay(filtered) as DayGroup[];
    return dayFilter ? all.filter((g) => g.date === dayFilter) : all;
  }, [filtered, dayFilter]);

  const [year, month] = ym.split('-').map((n) => parseInt(n, 10));
  const monthTitle = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <View>
      {/* centered month pill between hairlines */}
      <View style={styles.monthDivider}>
        <View style={[styles.hairline, { backgroundColor: t.line }]} />
        <View style={[styles.monthPill, { backgroundColor: t.ice50, borderColor: t.line }]}>
          <Text style={[styles.monthPillText, { color: t.text }]}>{monthTitle}</Text>
        </View>
        <View style={[styles.hairline, { backgroundColor: t.line }]} />
      </View>

      {dayFilter ? (
        <PressableScale onPress={onClearDay} scaleTo={0.95} style={styles.filterRow}>
          <View style={[styles.filterChip, { backgroundColor: t.ice100, borderColor: t.glassBorderSoft }]}>
            <Text style={[styles.filterText, { color: t.ocean600 }]}>Filtered to one day — tap to clear</Text>
          </View>
        </PressableScale>
      ) : transactions.length >= 4 ? (
        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: t.card, borderColor: t.line }]}>
            <Ionicons name="search" size={14} color={t.faint} />
            <TextInput
              style={[styles.searchInput, { color: t.text }]}
              placeholderTextColor={t.faint}
              placeholder="Search notes, categories, amounts"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query ? (
              <PressableScale onPress={() => setQuery('')} scaleTo={0.85}>
                <Ionicons name="close-circle" size={16} color={t.faint} />
              </PressableScale>
            ) : null}
          </View>
          <View style={styles.kindRow}>
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'expense', label: 'Out' },
                { key: 'income', label: 'In' },
                { key: 'transfer', label: 'Moves' },
              ] as const
            ).map((chip) => {
              const on = kind === chip.key;
              return (
                <PressableScale
                  key={chip.key}
                  onPress={() => setKind(chip.key)}
                  scaleTo={0.94}
                  style={[styles.kindChip, { backgroundColor: on ? t.ocean600 : t.card, borderColor: on ? t.ocean600 : t.line }]}
                >
                  <Text style={[styles.kindText, { color: on ? '#FFFFFF' : t.subtext }]}>{chip.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          icon={query || kind !== 'all' ? 'funnel-outline' : emptyIcon}
          title={query || kind !== 'all' ? 'Nothing matches' : emptyTitle}
          body={query || kind !== 'all' ? 'Try a different word, or clear the search and filters.' : emptyBody}
          mascot={!dayFilter && !query && kind === 'all'}
        />
      ) : (
        groups.map((g, gi) => {
          const showWeek = gi === 0 || weekStart(g.date) !== weekStart(groups[gi - 1].date);
          const net = g.income - g.expense;
          return (
            <View key={g.date}>
              {showWeek ? (
                <Text style={[styles.weekLabel, { color: t.faint }]}>{weekLabel(g.date)}</Text>
              ) : null}
              <View style={styles.dayHead}>
                <Text style={[styles.dayTitle, { color: t.text }]}>{dayTitle(g.date)}</Text>
                <Text
                  style={[styles.dayTotal, { color: net >= 0 ? t.income : t.expense }]}
                >
                  {net >= 0 ? '+' : '−'}
                  {formatMoney(Math.abs(net), currency)}
                </Text>
              </View>
              {g.items.map((tx) => {
                const cat = getCategory(tx.categoryId);
                if (!cat) return null;
                return (
                  <TransactionRow
                    key={tx.id}
                    category={cat}
                    amount={tx.amount}
                    type={tx.type}
                    date={tx.date}
                    note={tx.note}
                    currency={currency}
                    tx={tx}
                    onPress={onPressTx ? () => onPressTx(tx) : undefined}
                    onLongPress={onLongPressTx ? () => onLongPressTx(tx) : undefined}
                  />
                );
              })}
            </View>
          );
        })
      )}
    </View>
  );
}

function weekStart(date: string): string {
  const d = parseISO(date);
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  return s.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  monthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  hairline: { flex: 1, height: 1 },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  monthPillText: { fontFamily: font.bold, fontSize: 13 },
  filterRow: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  searchWrap: { marginTop: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontFamily: font.medium, fontSize: 13, paddingVertical: 0 },
  kindRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  kindChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  kindText: { fontFamily: font.bold, fontSize: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontFamily: font.bold, fontSize: 11.5 },
  weekLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  dayTitle: { fontFamily: font.bold, fontSize: 15 },
  dayTotal: { fontFamily: font.bold, fontSize: 13 },
});
