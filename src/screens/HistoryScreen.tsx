import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { categoriesFor, getCategory } from '../data/categories';
import { brandOcean, font, radius, spacing } from '../theme';
import { Transaction, TxType } from '../types';
import { groupByDay, dayLabel } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';

type TypeFilter = 'all' | TxType;

export function HistoryScreen() {
  const finance = useFinance();
  const ui = useUI();
  const { t, isDark } = useTheme();
  const { contentWidth } = useResponsive();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return finance.transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter && tx.categoryId !== categoryFilter) return false;
      if (q) {
        const cat = getCategory(tx.categoryId);
        const haystack = `${tx.note ?? ''} ${cat?.label ?? ''} ${tx.amount}`.toLowerCase();
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
      <AuroraBackground />
      <GradientHeader title="History" subtitle={`${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.75)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search note, category or amount…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.55)" />
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
      <View style={[styles.catStrip, { backgroundColor: isDark ? 'rgba(14,34,62,0.75)' : 'rgba(255,255,255,0.6)', borderBottomColor: t.line }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStripContent}>
          <TouchableOpacity
            onPress={() => setCategoryFilter(null)}
            style={[styles.catChip, { backgroundColor: t.ice50, borderColor: t.line }, categoryFilter === null && styles.catChipOn]}
          >
            <Text style={[styles.catChipText, { color: t.text }, categoryFilter === null && styles.catChipTextOn]}>All categories</Text>
          </TouchableOpacity>
          {categoriesFor(typeFilter === 'income' ? 'income' : 'expense').map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
              style={[styles.catChip, { backgroundColor: t.ice50, borderColor: t.line }, categoryFilter === c.id && styles.catChipOn]}
            >
              <Text style={[styles.catChipText, { color: t.text }, categoryFilter === c.id && styles.catChipTextOn]}>
                {c.emoji} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <EmptyState icon="search" title="Nothing found" body="Try a different search term, or clear the filters above." />
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
                <Text style={[styles.dayText, { color: t.subtext }]}>{dayLabel(g.date)}</Text>
                <Text style={[styles.dayTotal, { color: t.subtext }]}>
                  {g.income > 0 && <Text style={{ color: t.income }}>+{formatMoney(g.income, finance.settings.currency)}  </Text>}
                  {g.expense > 0 && <Text style={{ color: t.expense }}>−{formatMoney(g.expense, finance.settings.currency)}</Text>}
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
                    currency={finance.settings.currency}
                    onPress={() => ui.openEdit(tx)}
                    onLongPress={() => confirmDelete(tx)}
                  />
                );
              })}
            </View>
          ))}
          <Text style={[styles.hint, { color: t.faint }]}>
            Tip: tap a transaction to edit it, long-press to delete.
          </Text>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontFamily: font.medium, fontSize: 14, paddingVertical: 0 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  chipText: { color: 'rgba(255,255,255,0.92)', fontFamily: font.bold, fontSize: 13 },
  chipTextOn: { color: '#0A5C8C' },
  catStrip: {
    borderBottomWidth: 1,
  },
  catStripContent: { paddingHorizontal: spacing.xl, paddingVertical: 10, gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  catChipOn: { backgroundColor: brandOcean, borderColor: brandOcean },
  catChipText: { fontFamily: font.medium, fontSize: 12 },
  catChipTextOn: { color: '#FFFFFF' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  dayText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  dayTotal: { fontFamily: font.bold, fontSize: 12 },
  hint: { fontFamily: font.medium, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
});
