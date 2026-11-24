import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { GlassCard } from '../components/GlassCard';
import { AuroraBackground } from '../components/AuroraBackground';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { Entrance } from '../components/Entrance';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AccountsStrip } from '../components/AccountsStrip';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useTasks } from '../store/TasksContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getCategory } from '../data/categories';
import { radius, shadow, spacing } from '../theme';
import { currentMonthKey, monthKey, monthLabel, shiftMonth, totalsForMonth } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';

export function HomeScreen() {
  const finance = useFinance();
  const tasks = useTasks();
  const ui = useUI();
  const navigation = useNavigation();
  const { t } = useTheme();
  const { contentWidth } = useResponsive();
  const [ym, setYm] = useState(currentMonthKey());

  const totals = useMemo(() => totalsForMonth(finance.transactions, ym), [finance.transactions, ym]);
  const recent = useMemo(
    () => finance.transactions.filter((tx) => monthKey(tx.date) === ym).slice(0, 5),
    [finance.transactions, ym]
  );
  const nextTask = useMemo(
    () => tasks.tasks.filter((x) => !x.done).sort((a, b) => Number(b.important) - Number(a.important) || b.createdAt - a.createdAt)[0],
    [tasks.tasks]
  );
  const daysSoFar = ym === currentMonthKey() ? new Date().getDate() : 1;
  const dailyAvg = totals.expense / Math.max(daysSoFar, 1);

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title={`Hi, ${finance.settings.userName}`} subtitle="Your money, at a glance">
          {/* month switcher */}
          <Entrance delay={0}>
            <View style={styles.monthRow}>
              <PressableScale onPress={() => setYm(shiftMonth(ym, -1))} style={styles.monthBtn} scaleTo={0.88}>
                <Ionicons name="chevron-back" size={18} color={t.white} />
              </PressableScale>
              <Text style={styles.monthText}>{monthLabel(ym, true)}</Text>
              <PressableScale
                onPress={() => setYm(shiftMonth(ym, 1))}
                style={styles.monthBtn}
                scaleTo={0.88}
                disabled={ym >= currentMonthKey()}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={ym >= currentMonthKey() ? 'rgba(255,255,255,0.35)' : t.white}
                />
              </PressableScale>
            </View>
          </Entrance>

          {/* balance card — warm paper laid over the dusk header */}
          <Entrance delay={60}>
            <GlassCard hi tint="#FFFDF8">
              <Text style={styles.glassLabel}>Net this month</Text>
              <AnimatedNumber
                value={totals.net}
                format={(n) => formatMoney(n, finance.settings.currency)}
                style={[styles.net, { color: totals.net >= 0 ? '#177E71' : '#C24D53' }]}
              />
              <View style={styles.splitRow}>
                <View style={styles.split}>
                  <View style={styles.dotRow}>
                    <View style={[styles.dot, { backgroundColor: '#177E71' }]} />
                    <Text style={styles.splitLabel}>Income</Text>
                  </View>
                  <Text style={styles.splitValue}>{formatMoney(totals.income, finance.settings.currency)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.split}>
                  <View style={styles.dotRow}>
                    <View style={[styles.dot, { backgroundColor: '#C24D53' }]} />
                    <Text style={styles.splitLabel}>Spent</Text>
                  </View>
                  <Text style={styles.splitValue}>{formatMoney(totals.expense, finance.settings.currency)}</Text>
                </View>
              </View>
            </GlassCard>
          </Entrance>

          {/* wallets strip */}
          <Entrance delay={120}>
            <AccountsStrip />
          </Entrance>
        </GradientHeader>

        {/* quick stats + actions */}
        <View style={[styles.body, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}>
          <Entrance delay={180}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: t.card, borderWidth: 1, borderColor: t.glassBorderSoft }, shadow.card]}>
                <Text style={[styles.statLabel, { color: t.subtext }]}>Daily average</Text>
                <Text style={[styles.statValue, { color: t.text }]}>{formatMoney(dailyAvg, finance.settings.currency)}</Text>
              </View>
              <View style={styles.actionWrap}>
                <GlassCard style={styles.statCard} onPress={() => navigation.navigate('Advisor' as never)}>
                  <Text style={[styles.statLabel, { color: t.subtext }]}>Advisor</Text>
                  <View style={styles.statAction}>
                    <Ionicons name="bulb-outline" size={16} color={t.ocean600} />
                    <Text style={[styles.statValue, { color: t.ocean600, fontSize: 14 }]}>Get tips</Text>
                  </View>
                </GlassCard>
              </View>
            </View>
          </Entrance>

          <Entrance delay={240}>
            <View style={styles.actionRow}>
              <View style={styles.actionWrap}>
                <PressableScale style={styles.actionBtn} onPress={() => ui.openAdd()} haptic="light">
                  <View style={[styles.actionAdd, shadow.card]}>
                    <Ionicons name="add-circle" size={22} color={t.white} />
                    <Text style={styles.addText}>Add</Text>
                  </View>
                </PressableScale>
              </View>
              <View style={styles.actionWrap}>
                <PressableScale
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('Scan' as never)}
                  haptic="light"
                >
                  <View style={[styles.actionScan, shadow.card]}>
                    <Ionicons name="scan-outline" size={22} color="#1D2D3E" />
                    <Text style={[styles.addText, { color: '#1D2D3E' }]}>Scan receipt</Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          </Entrance>

          {/* next task widget */}
          {nextTask ? (
            <Entrance delay={280}>
              <GlassCard
                style={styles.nextTask}
                onPress={() => navigation.navigate('Tasks' as never)}
              >
                <View style={[styles.nextTaskIcon, nextTask.important && styles.nextTaskIconHi]}>
                  <Ionicons name={nextTask.important ? 'star' : 'list'} size={15} color={t.white} />
                </View>
                <View style={styles.nextTaskMid}>
                  <Text style={[styles.nextTaskLabel, { color: t.subtext }]}>Next up</Text>
                  <Text style={[styles.nextTaskTitle, { color: t.text }]} numberOfLines={1}>
                    {nextTask.title}
                  </Text>
                </View>
                <Text style={[styles.nextTaskCount, { color: t.ocean600 }]}>{tasks.openCount} open</Text>
                <Ionicons name="chevron-forward" size={15} color={t.faint} />
              </GlassCard>
            </Entrance>
          ) : null}

          {/* recent */}
          <Entrance delay={300}>
            <View style={styles.recentHead}>
              <Text style={[styles.recentTitle, { color: t.text }]}>Recent transactions</Text>
              {recent.length > 0 && (
                <PressableScale onPress={() => navigation.navigate('History' as never)}>
                  <Text style={[styles.seeAll, { color: t.ocean600 }]}>See all</Text>
                </PressableScale>
              )}
            </View>
          </Entrance>

          {recent.length === 0 ? (
            <EmptyState
              emoji="🌊"
              title="No transactions yet"
              body="Tap Add to log your first expense, or Scan to capture a grocery receipt — your advisor wakes up with the first entry."
            />
          ) : (
            recent.map((tx, i) => {
              const cat = getCategory(tx.categoryId);
              if (!cat) return null;
              return (
                <Entrance key={tx.id} delay={340 + i * 45}>
                  <TransactionRow
                    category={cat}
                    amount={tx.amount}
                    type={tx.type}
                    date={tx.date}
                    note={tx.note}
                    currency={finance.settings.currency}
                    onPress={() => ui.openEdit(tx)}
                  />
                </Entrance>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  monthBtn: { padding: 6 },
  monthText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginHorizontal: spacing.sm },
  glassLabel: { color: '#A0762B', fontSize: 12.5, marginBottom: 2, fontWeight: '700', letterSpacing: 0.2 },
  net: { fontSize: 32, fontWeight: '900', fontFamily: undefined },
  splitRow: { flexDirection: 'row', marginTop: spacing.md },
  split: { flex: 1 },
  divider: { width: 1, backgroundColor: 'rgba(30,44,60,0.14)', marginHorizontal: spacing.md },
  dotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  splitLabel: { color: '#5C6C7B', fontSize: 12 },
  splitValue: { color: '#1D2D3E', fontSize: 16, fontWeight: '800' },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statsWrap: { flex: 1 },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actionWrap: { flex: 1 },
  actionBtn: { flex: 1, borderRadius: radius.md },
  actionAdd: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
    backgroundColor: '#0A5C8C',
  },
  actionScan: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
    backgroundColor: '#E9C46A',
  },
  addText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  nextTask: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  nextTaskIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0A5C8C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTaskIconHi: { backgroundColor: '#C98A2C' },
  nextTaskMid: { flex: 1, marginHorizontal: spacing.md },
  nextTaskLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  nextTaskTitle: { fontSize: 14.5, fontWeight: '800', marginTop: 1 },
  nextTaskCount: { fontSize: 12, fontWeight: '800', marginRight: 4 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  recentTitle: { fontSize: 17, fontWeight: '800' },
  seeAll: { fontWeight: '700', fontSize: 13 },
});
