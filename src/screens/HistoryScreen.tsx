import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { categoriesFor, getCategory } from '../data/categories';
import { colors, radius, shadow, spacing } from '../theme';
import { Transaction, TxType } from '../types';
import { groupByDay } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';

type TypeFilter = 'all' | TxType;

export function HistoryScreen() {
  const finance = useFinance();
  const ui = useUI();
  const { contentWidth } = useResponsive();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return finance.transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      if (q) {
        const cat = getCategory(t.categoryId);
        const haystack = `${t.note ?? ''} ${cat?.label ?? ''} ${t.amount}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [finance.transactions, query, typeFilter, categoryFilter]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const confirmDelete = (tx: Transaction) => {
    Alert.alert('Delete transaction', 'This cannot be undone. Delete it?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => finance.deleteTransaction(tx.id) },
    ]);
  };

  const chips: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expense', label: 'Expenses' },
    { key: 'income', label: 'Income' },
  ];

  return (
    <View style={styles.root}>
      <GradientHeader title="History" subtitle={`${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search note, category or amount…"
            placeholderTextColor={colors.faint}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.faint} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <TouchableOpacity
              key={c.key}
              onPress={() => setTypeFilter(c.key)}
              style={[styles.chip, typeFilter === c.key && styles.chipOn]}
            >
              <Text style={[styles.chipText, typeFilter === c.key && styles.chipTextOn]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GradientHeader>

      {/* category filter strip */}
      <View style={styles.catStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStripContent}>
          <TouchableOpacity
            onPress={() => setCategoryFilter(null)}
            style={[styles.catChip, categoryFilter === null && styles.catChipOn]}
          >
            <Text style={[styles.catChipText, categoryFilter === null && styles.catChipTextOn]}>All categories</Text>
          </TouchableOpacity>
          {categoriesFor(typeFilter === 'income' ? 'income' : 'expense').map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
              style={[styles.catChip, categoryFilter === c.id && styles.catChipOn]}
            >
              <Text style={[styles.catChipText, categoryFilter === c.id && styles.catChipTextOn]}>
                {c.emoji} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <EmptyState emoji="🔎" title="Nothing found" body="Try a different search term, or clear the filters above." />
      ) : (
      <ScrollView
        contentContainerStyle={[
          styles.list,
          contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
          {groups.map((g) => (
            <View key={g.date}>
              <View style={styles.dayHead}>
                <Text style={styles.dayText}>{g.date}</Text>
                <Text style={styles.dayTotal}>
                  {g.income > 0 && <Text style={{ color: colors.income }}>+{formatMoney(g.income, finance.settings.currency)}  </Text>}
                  {g.expense > 0 && <Text style={{ color: colors.expense }}>−{formatMoney(g.expense, finance.settings.currency)}</Text>}
                </Text>
              </View>
              {g.items.map((t) => {
                const cat = getCategory(t.categoryId);
                if (!cat) return null;
                return (
                  <TransactionRow
                    key={t.id}
                    category={cat}
                    amount={t.amount}
                    type={t.type}
                    date={t.date}
                    note={t.note}
                    currency={finance.settings.currency}
                    onPress={() => ui.openEdit(t)}
                    onLongPress={() => confirmDelete(t)}
                  />
                );
              })}
            </View>
          ))}
          <Text style={styles.hint}>
            Tip: tap a transaction to edit it, long-press to delete.
          </Text>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipOn: { backgroundColor: colors.white, borderColor: colors.white },
  chipText: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: colors.ocean800 },
  catStrip: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  catStripContent: { paddingHorizontal: spacing.xl, paddingVertical: 10, gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.ice50,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  catChipOn: { backgroundColor: colors.ocean600, borderColor: colors.ocean600 },
  catChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  catChipTextOn: { color: colors.white },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  dayText: { color: colors.subtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayTotal: { color: colors.subtext, fontSize: 12, fontWeight: '700' },
  hint: { color: colors.faint, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
});
