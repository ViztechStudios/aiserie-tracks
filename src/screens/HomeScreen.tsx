import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader, GlassCard } from '../components/GradientHeader';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { getCategory } from '../data/categories';
import { colors, radius, shadow, spacing } from '../theme';
import { currentMonthKey, monthKey, monthLabel, shiftMonth, totalsForMonth } from '../utils/stats';
import { formatMoney } from '../utils/money';

export function HomeScreen() {
  const finance = useFinance();
  const ui = useUI();
  const navigation = useNavigation();
  const [ym, setYm] = useState(currentMonthKey());

  const totals = useMemo(() => totalsForMonth(finance.transactions, ym), [finance.transactions, ym]);
  const recent = useMemo(
    () =>
      finance.transactions
        .filter((t) => monthKey(t.date) === ym)
        .slice(0, 5),
    [finance.transactions, ym]
  );
  const daysSoFar = ym === currentMonthKey() ? new Date().getDate() : 1;
  const dailyAvg = totals.expense / Math.max(daysSoFar, 1);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title="Aiserie Tracks" subtitle="Your money, in clear blue water">
          {/* month switcher */}
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setYm(shiftMonth(ym, -1))} style={styles.monthBtn}>
              <Ionicons name="chevron-back" size={18} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthLabel(ym, true)}</Text>
            <TouchableOpacity
              onPress={() => setYm(shiftMonth(ym, 1))}
              style={styles.monthBtn}
              disabled={ym >= currentMonthKey()}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={ym >= currentMonthKey() ? 'rgba(255,255,255,0.35)' : colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* balance glass card */}
          <GlassCard>
            <Text style={styles.glassLabel}>Net this month</Text>
            <Text style={[styles.net, { color: totals.net >= 0 ? '#D9FBF3' : '#FFD9DD' }]}>
              {formatMoney(totals.net, finance.settings.currency)}
            </Text>
            <View style={styles.splitRow}>
              <View style={styles.split}>
                <View style={styles.dotRow}>
                  <View style={[styles.dot, { backgroundColor: '#5CEBC0' }]} />
                  <Text style={styles.splitLabel}>Income</Text>
                </View>
                <Text style={styles.splitValue}>{formatMoney(totals.income, finance.settings.currency)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.split}>
                <View style={styles.dotRow}>
                  <View style={[styles.dot, { backgroundColor: '#FF9AA5' }]} />
                  <Text style={styles.splitLabel}>Spent</Text>
                </View>
                <Text style={styles.splitValue}>{formatMoney(totals.expense, finance.settings.currency)}</Text>
              </View>
            </View>
          </GlassCard>
        </GradientHeader>

        {/* quick stats + actions */}
        <View style={styles.body}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, shadow.card]}>
              <Text style={styles.statLabel}>Daily average</Text>
              <Text style={styles.statValue}>{formatMoney(dailyAvg, finance.settings.currency)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.statCard, shadow.card]}
              onPress={() => navigation.navigate('Advisor' as never)}
            >
              <Text style={styles.statLabel}>Advisor</Text>
              <View style={styles.statAction}>
                <Ionicons name="sparkles" size={16} color={colors.ocean600} />
                <Text style={[styles.statValue, { color: colors.ocean600, fontSize: 14 }]}>Get tips</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => ui.openAdd()}>
              <Ionicons name="add-circle" size={22} color={colors.white} />
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.aqua400 }]}
              onPress={() => navigation.navigate('Scan' as never)}
            >
              <Ionicons name="scan-outline" size={22} color={colors.white} />
              <Text style={styles.addText}>Scan receipt</Text>
            </TouchableOpacity>
          </View>

          {/* recent */}
          <View style={styles.recentHead}>
            <Text style={styles.recentTitle}>Recent transactions</Text>
            {recent.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('History' as never)}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {recent.length === 0 ? (
            <EmptyState
              emoji="🌊"
              title="No transactions yet"
              body="Tap Add to log your first expense, or Scan to capture a grocery receipt — your advisor wakes up with the first entry."
            />
          ) : (
            recent.map((t) => {
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
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  monthBtn: { padding: 6 },
  monthText: { color: colors.white, fontSize: 15, fontWeight: '700', marginHorizontal: spacing.sm },
  glassLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 2 },
  net: { fontSize: 32, fontWeight: '900' },
  splitRow: { flexDirection: 'row', marginTop: spacing.md },
  split: { flex: 1 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: spacing.md },
  dotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  splitLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  splitValue: { color: colors.white, fontSize: 16, fontWeight: '800' },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg },
  statLabel: { color: colors.subtext, fontSize: 12, marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  addBtn: {
    flex: 1,
    backgroundColor: colors.ocean600,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  addText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  recentTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  seeAll: { color: colors.ocean600, fontWeight: '700', fontSize: 13 },
});
