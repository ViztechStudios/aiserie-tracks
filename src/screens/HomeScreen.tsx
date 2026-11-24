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
import { brandOcean, font, radius, shadow, spacing } from '../theme';
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

  const atCurrentMonth = ym >= currentMonthKey();

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title={`Hi, ${finance.settings.userName}`} subtitle="Your money, at a glance">
          {/* balance card — white paper set into the ink panel */}
          <Entrance delay={60}>
            <GlassCard hi tint={t.card} style={styles.balanceCard}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.cardLabel, { color: t.sun500 }]}>NET THIS MONTH</Text>
                <View style={styles.monthRow}>
                  <PressableScale onPress={() => setYm(shiftMonth(ym, -1))} style={styles.monthBtn} scaleTo={0.88}>
                    <Ionicons name="chevron-back" size={15} color={t.subtext} />
                  </PressableScale>
                  <Text style={[styles.monthText, { color: t.text }]}>{monthLabel(ym, true)}</Text>
                  <PressableScale
                    onPress={() => setYm(shiftMonth(ym, 1))}
                    style={styles.monthBtn}
                    scaleTo={0.88}
                    disabled={atCurrentMonth}
                  >
                    <Ionicons name="chevron-forward" size={15} color={atCurrentMonth ? t.faint : t.subtext} />
                  </PressableScale>
                </View>
              </View>
              <AnimatedNumber
                value={totals.net}
                format={(n) => formatMoney(n, finance.settings.currency)}
                style={[styles.net, { color: totals.net >= 0 ? t.text : t.expense }]}
              />
              <View style={[styles.splitRow, { borderTopColor: t.line }]}>
                <View style={styles.split}>
                  <View style={styles.dotRow}>
                    <View style={[styles.dot, { backgroundColor: t.income }]} />
                    <Text style={[styles.splitLabel, { color: t.subtext }]}>Income</Text>
                  </View>
                  <Text style={[styles.splitValue, { color: t.text }]}>
                    {formatMoney(totals.income, finance.settings.currency)}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: t.line }]} />
                <View style={styles.split}>
                  <View style={styles.dotRow}>
                    <View style={[styles.dot, { backgroundColor: t.expense }]} />
                    <Text style={[styles.splitLabel, { color: t.subtext }]}>Spent</Text>
                  </View>
                  <Text style={[styles.splitValue, { color: t.text }]}>
                    {formatMoney(totals.expense, finance.settings.currency)}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Entrance>
        </GradientHeader>

        {/* wallets + stats + actions */}
        <View style={[styles.body, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}>
          <Entrance delay={140}>
            <AccountsStrip />
          </Entrance>

          <Entrance delay={180}>
            <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: t.subtext }]}>DAILY AVERAGE</Text>
                <Text style={[styles.statValue, { color: t.text }]}>
                  {formatMoney(dailyAvg, finance.settings.currency)}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: t.line }]} />
              <PressableScale
                style={styles.statCell}
                onPress={() => navigation.navigate('Advisor' as never)}
                scaleTo={0.97}
              >
                <Text style={[styles.statLabel, { color: t.subtext }]}>ADVISOR</Text>
                <View style={styles.statAction}>
                  <Ionicons name="bulb-outline" size={15} color={t.ocean600} />
                  <Text style={[styles.statValue, { color: t.ocean600, fontSize: 15 }]}>Get tips</Text>
                  <Ionicons name="chevron-forward" size={13} color={t.faint} />
                </View>
              </PressableScale>
            </View>
          </Entrance>

          <Entrance delay={240}>
            <View style={styles.actionRow}>
              <View style={styles.actionWrap}>
                <PressableScale style={styles.actionBtn} onPress={() => ui.openAdd()} haptic="light">
                  <View style={[styles.actionAdd, { backgroundColor: brandOcean }]}>
                    <Ionicons name="add" size={19} color={t.white} />
                    <Text style={[styles.actionText, { color: t.white }]}>Add</Text>
                  </View>
                </PressableScale>
              </View>
              <View style={styles.actionWrap}>
                <PressableScale
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('Scan' as never)}
                  haptic="light"
                >
                  <View style={[styles.actionScan, { backgroundColor: t.goldWash }]}>
                    <Ionicons name="scan-outline" size={18} color={t.text} />
                    <Text style={[styles.actionText, { color: t.text }]}>Scan receipt</Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          </Entrance>

          {/* next task */}
          {nextTask ? (
            <Entrance delay={280}>
              <GlassCard style={styles.nextTask} onPress={() => navigation.navigate('Tasks' as never)}>
                <View style={[styles.nextTaskIcon, { backgroundColor: nextTask.important ? t.sun500 : brandOcean }]}>
                  <Ionicons name={nextTask.important ? 'star' : 'list'} size={14} color={t.white} />
                </View>
                <View style={styles.nextTaskMid}>
                  <Text style={[styles.nextTaskLabel, { color: t.subtext }]}>NEXT UP</Text>
                  <Text style={[styles.nextTaskTitle, { color: t.text }]} numberOfLines={1}>
                    {nextTask.title}
                  </Text>
                </View>
                <Text style={[styles.nextTaskCount, { color: t.ocean600 }]}>{tasks.openCount} open</Text>
                <Ionicons name="chevron-forward" size={14} color={t.faint} />
              </GlassCard>
            </Entrance>
          ) : null}

          {/* recent */}
          <Entrance delay={300}>
            <View style={styles.recentHead}>
              <Text style={[styles.recentTitle, { color: t.text }]}>Recent</Text>
              {recent.length > 0 && (
                <PressableScale onPress={() => navigation.navigate('History' as never)}>
                  <Text style={[styles.seeAll, { color: t.ocean600 }]}>See all</Text>
                </PressableScale>
              )}
            </View>
          </Entrance>

          {recent.length === 0 ? (
            <EmptyState
              icon="water"
              title="No transactions yet"
              body="Tap Add to log your first expense, or scan a receipt to get started. Your advisor turns on with the first entry."
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
  balanceCard: { marginTop: spacing.lg },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2 },
  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthBtn: { padding: 4 },
  monthText: { fontFamily: font.bold, fontSize: 12.5, marginHorizontal: 2 },
  net: { fontFamily: font.heavy, fontSize: 32, letterSpacing: 0.2 },
  splitRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  split: { flex: 1 },
  divider: { width: 1, alignSelf: 'stretch', marginHorizontal: spacing.md },
  dotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  splitLabel: { fontFamily: font.medium, fontSize: 12 },
  splitValue: { fontFamily: font.bold, fontSize: 15 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 130 },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  statCell: { flex: 1, alignItems: 'flex-start' },
  statLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.2, marginBottom: 4 },
  statValue: { fontFamily: font.bold, fontSize: 17 },
  statAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDivider: { width: 1, alignSelf: 'stretch', marginHorizontal: spacing.lg },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actionWrap: { flex: 1 },
  actionBtn: { flex: 1, borderRadius: radius.md },
  actionAdd: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 7,
  },
  actionScan: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 7,
  },
  actionText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 0.1 },
  nextTask: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  nextTaskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTaskMid: { flex: 1, marginHorizontal: spacing.md },
  nextTaskLabel: { fontFamily: font.bold, fontSize: 9.5, letterSpacing: 1.2 },
  nextTaskTitle: { fontFamily: font.bold, fontSize: 14, marginTop: 2 },
  nextTaskCount: { fontFamily: font.bold, fontSize: 12, marginRight: 4 },
  recentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  recentTitle: { fontFamily: font.display, fontSize: 19, color: '#1A2B3C' },
  seeAll: { fontFamily: font.bold, fontSize: 13 },
});
