import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { MascotWiggle } from '../components/MascotWiggle';
import { MonthChips } from '../components/MonthChips';
import { MonthTxList } from '../components/MonthTxList';
import { AccountsStrip } from '../components/AccountsStrip';
import { GlassCard } from '../components/GlassCard';
import { StreakCard } from '../components/StreakCard';
import { PressableScale } from '../components/PressableScale';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { accountBalance } from '../utils/accounts';
import { getCategory } from '../data/categories';
import { font, radius, spacing } from '../theme';
import { buildAdvisorReport, currentMonthKey, monthKey, monthLabel, totalsForMonth } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';
import { Transaction } from '../types';

/**
 * Balance — the main page, drawn the way the showroom mockups draw it
 * (v4.3.0): an open aurora canvas, and floating frosted panes — the
 * safe-to-spend hero with its in/out chips, the balance & savings tiles,
 * the advisor line, and the recent ledger. The full month trail stays one
 * tap away behind "See all", and the wallet strip + streak close the page.
 */
export function HomeScreen() {
  const finance = useFinance();
  const ui = useUI();
  const navigation = useNavigation();
  const { t, isDark } = useTheme();
  const { contentWidth } = useResponsive();
  const [ym, setYm] = useState(currentMonthKey());
  const [showAll, setShowAll] = useState(false);

  const curYm = currentMonthKey();
  const totals = useMemo(() => totalsForMonth(finance.transactions, curYm), [finance.transactions, curYm]);
  const report = useMemo(
    () => buildAdvisorReport(finance.transactions, curYm, finance.settings.currency),
    [finance.transactions, curYm, finance.settings.currency]
  );
  const monthTxs = useMemo(
    () => finance.transactions.filter((tx) => monthKey(tx.date) === ym),
    [finance.transactions, ym]
  );
  const walletsTotal = useMemo(
    () => finance.accounts.reduce((sum, a) => sum + accountBalance(a, finance.transactions), 0),
    [finance.accounts, finance.transactions]
  );
  const savingsRate = totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : 0;
  const kept = totals.income - totals.expense;

  /** The five most recent entries, newest first — the mockup's RECENT pane. */
  const recent = useMemo(() => {
    return [...finance.transactions]
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
      .slice(0, 5);
  }, [finance.transactions]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Good night,';
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  // veil header inks — theme-aware since v4.3.0 (no more painted fern block)
  const heroInk = isDark ? '#FFFFFF' : '#12331F';
  const heroSub = isDark ? 'rgba(240,248,243,0.72)' : 'rgba(22,56,42,0.72)';
  const actionBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(19,54,36,0.08)';

  const safe = report.safeToSpendPerDay;
  const advisorLine =
    safe !== null
      ? `Advisor: on track — ${formatMoney(safe, finance.settings.currency)}/day to payday`
      : report.insights.length > 0
        ? `Advisor: ${report.insights[0].title}`
        : 'Advisor: add this month’s income to unlock daily guidance';

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader bare tone="deep">
          {/* greeting row — mascot, name, quick actions */}
          <View style={styles.topRow}>
            <View style={styles.mascotBubble}>
              <MascotWiggle bob={2.5} tilt={2.6} duration={1900}>
                <Image source={require('../../assets/mascot-wave.png')} style={styles.mascotImg} resizeMode="contain" />
              </MascotWiggle>
            </View>
            <View style={styles.topMid}>
              <Text style={[styles.hello, { color: heroSub }]} numberOfLines={1}>
                {greeting}
              </Text>
              <Text style={[styles.userName, { color: heroInk }]} numberOfLines={1}>
                {finance.settings.userName || 'Friend'}
              </Text>
            </View>
            <View style={styles.actions}>
              <PressableScale
                onPress={() => navigation.navigate('Scan' as never)}
                scaleTo={0.9}
                style={[styles.actionCircle, { backgroundColor: actionBg }]}
                accessibilityRole="button"
                accessibilityLabel="Scan a receipt"
              >
                <Ionicons name="scan-outline" size={18} color={heroInk} />
              </PressableScale>
              <PressableScale
                onPress={() => navigation.navigate('Settings' as never)}
                scaleTo={0.9}
                style={[styles.actionCircle, { backgroundColor: actionBg }]}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <Ionicons name="settings-outline" size={18} color={heroInk} />
              </PressableScale>
            </View>
          </View>
        </GradientHeader>

        <View style={[styles.body, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}>
          {/* hero — safe to spend today (falls back to the month net when
              there is no income yet to pace against) */}
          <Entrance delay={60}>
            <GlassCard hi style={styles.heroCard}>
              <Text style={[styles.heroLabel, { color: heroSub }]}>
                {safe !== null ? 'SAFE TO SPEND TODAY' : `${monthLabel(curYm, false).toUpperCase()} NET`}
              </Text>
              <AnimatedNumber
                value={safe !== null ? safe : totals.net}
                flash="auto"
                restingColor={heroInk}
                flashUpColor="#9FE7C0"
                flashDownColor="#FFC9CD"
                style={[styles.heroValue, { color: heroInk }]}
                format={(n) => (safe !== null ? formatMoney(n, finance.settings.currency) : `${totals.net >= 0 ? '+' : '−'}${formatMoney(Math.abs(n), finance.settings.currency)}`)}
              />
              {/* the in / out chips */}
              <View style={styles.chipRow}>
                <View style={[styles.chip, { backgroundColor: t.income + '1F' }]}>
                  <Text style={[styles.chipText, { color: t.income }]}>
                    +{formatMoney(totals.income, finance.settings.currency)} in
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: t.expense + '1F' }]}>
                  <Text style={[styles.chipText, { color: t.expense }]}>
                    −{formatMoney(totals.expense, finance.settings.currency)} out
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Entrance>

          {/* the two showroom tiles — total balance · savings rate */}
          <Entrance delay={110}>
            <View style={styles.tileRow}>
              <PressableScale onPress={() => navigation.navigate('Wallets' as never)} scaleTo={0.96} style={styles.tilePress}>
                <GlassCard style={styles.tile}>
                  <View style={[styles.tileIcon, { backgroundColor: t.ocean600 + '1C' }]}>
                    <Ionicons name="wallet-outline" size={16} color={t.ocean600} />
                  </View>
                  <AnimatedNumber
                    value={walletsTotal}
                    flash="auto"
                    restingColor={heroInk}
                    flashUpColor="#9FE7C0"
                    flashDownColor="#FFC9CD"
                    style={[styles.tileValue, { color: heroInk }]}
                    format={(n) => formatMoney(n, finance.settings.currency)}
                  />
                  <Text style={[styles.tileLabel, { color: heroSub }]}>Total balance</Text>
                </GlassCard>
              </PressableScale>
              <PressableScale onPress={() => navigation.navigate('Insights' as never)} scaleTo={0.96} style={styles.tilePress}>
                <GlassCard style={styles.tile}>
                  <View style={[styles.tileIcon, { backgroundColor: t.ocean600 + '1C' }]}>
                    <Ionicons name="trending-up" size={16} color={t.ocean600} />
                  </View>
                  <Text style={[styles.tileValue, { color: heroInk }]}>
                    {totals.income > 0 ? `${Math.max(savingsRate, 0)}%` : '—'}
                  </Text>
                  <Text style={[styles.tileLabel, { color: heroSub }]}>Savings rate</Text>
                </GlassCard>
              </PressableScale>
            </View>
          </Entrance>

          {/* the advisor line */}
          <Entrance delay={150}>
            <GlassCard style={styles.advisorRow} onPress={() => navigation.navigate('Insights' as never)}>
              <View style={[styles.advisorIcon, { backgroundColor: t.ocean600 + '1C' }]}>
                <Ionicons name="add" size={15} color={t.ocean600} />
              </View>
              <Text style={[styles.advisorText, { color: isDark ? '#BFF0D9' : '#1E5C3C' }]} numberOfLines={2}>
                {advisorLine}
              </Text>
            </GlassCard>
          </Entrance>

          {/* recent — five latest entries, expandable to the full month */}
          <Entrance delay={190}>
            <GlassCard style={styles.recentCard}>
              <View style={styles.recentHead}>
                <Text style={[styles.recentLabel, { color: heroSub }]}>RECENT</Text>
                <PressableScale
                  onPress={() => setShowAll((v) => !v)}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={showAll ? 'Show only recent entries' : 'See all entries this month'}
                >
                  <Text style={[styles.seeAll, { color: t.ocean600 }]}>{showAll ? 'Show less' : 'See all'}</Text>
                </PressableScale>
              </View>

              {recent.map((tx) => (
                <RecentRow key={tx.id} tx={tx} currency={finance.settings.currency} onPress={() => ui.openEdit(tx)} />
              ))}
              {recent.length === 0 ? (
                <Text style={[styles.recentEmpty, { color: t.subtext }]}>
                  Nothing logged yet — tap + to add your first entry.
                </Text>
              ) : null}

              {showAll ? (
                <View style={styles.ledgerWrap}>
                  <MonthChips ym={ym} onChange={setYm} variant="onGreen" />
                  <MonthTxList
                    ym={ym}
                    transactions={monthTxs}
                    currency={finance.settings.currency}
                    accounts={finance.accounts}
                    onPressTx={(tx) => ui.openEdit(tx)}
                  />
                </View>
              ) : null}
            </GlassCard>
          </Entrance>

          <Entrance delay={240}>
            <AccountsStrip />
          </Entrance>

          {/* daily streak with the tabby */}
          <Entrance delay={300}>
            <View style={{ marginTop: spacing.lg }}>
              <StreakCard />
            </View>
          </Entrance>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * One compact recent row — the mockup's dot + label + amount line. Reads no
 * context beyond what it is handed, so the pane stays cheap to render.
 */
function RecentRow({ tx, currency, onPress }: { tx: Transaction; currency: string; onPress: () => void }) {
  const { t } = useTheme();
  const cat = getCategory(tx.categoryId);
  const transfer = tx.type === 'transfer';
  const tint = tx.type === 'income' ? t.income : transfer ? t.ocean600 : t.expense;
  const label = transfer ? 'Transfer' : tx.note ? tx.note : cat?.label ?? 'Entry';
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={styles.recentRow} accessibilityRole="button" accessibilityLabel={`Edit ${label}`}>
      <View style={[styles.recentDot, { backgroundColor: transfer ? t.ocean600 : cat?.color ?? t.faint }]} />
      <Text style={[styles.recentName, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.recentAmount, { color: tint }]}>
        {tx.type === 'income' ? '+' : transfer ? '' : '−'}
        {formatMoney(tx.amount, currency)}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  mascotBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  mascotImg: { width: 46, height: 46, marginTop: 3 },
  topMid: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  hello: { fontFamily: font.medium, fontSize: 12.5 },
  userName: { fontFamily: font.display, fontSize: 24, marginTop: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: 132 },

  // hero pane
  heroCard: { borderRadius: radius.lg + 2, padding: spacing.xl - 2 },
  heroLabel: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.6 },
  heroValue: {
    fontFamily: font.heavy,
    fontSize: 38,
    marginTop: 8,
    letterSpacing: 0.2,
    flexShrink: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md + 2 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: font.bold, fontSize: 12 },

  // showroom tiles
  tileRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  tilePress: { flex: 1 },
  tile: { flex: 1, padding: spacing.lg - 2 },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  tileValue: {
    fontFamily: font.heavy,
    fontSize: 21,
    flexShrink: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  tileLabel: { fontFamily: font.medium, fontSize: 11.5, marginTop: 3 },

  // advisor line
  advisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    marginTop: spacing.md,
  },
  advisorIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisorText: { flex: 1, fontFamily: font.bold, fontSize: 12.5, marginLeft: spacing.sm + 2 },

  // recent pane
  recentCard: { marginTop: spacing.md, borderRadius: radius.lg + 2 },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  recentLabel: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.6 },
  seeAll: { fontFamily: font.bold, fontSize: 12.5 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9.5,
  },
  recentDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: spacing.md + 2,
  },
  recentName: { flex: 1, fontFamily: font.medium, fontSize: 13.5, marginRight: spacing.sm },
  recentAmount: { fontFamily: font.bold, fontSize: 13.5 },
  recentEmpty: { fontFamily: font.medium, fontSize: 12.5, paddingVertical: spacing.sm },
  ledgerWrap: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(157,196,175,0.14)', paddingTop: spacing.md },
});
