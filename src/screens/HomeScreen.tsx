import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { MonthChips } from '../components/MonthChips';
import { MonthSummary } from '../components/MonthSummary';
import { MonthTxList } from '../components/MonthTxList';
import { AccountsStrip } from '../components/AccountsStrip';
import { GlassCard } from '../components/GlassCard';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { accountBalance } from '../utils/accounts';
import { font, spacing } from '../theme';
import { currentMonthKey, monthKey, monthLabel, totalsForMonth } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';

/**
 * Balance — the main page. A deep fern header greets you with the two small
 * companions (a waving tabby by your name), the month balance in ink-white,
 * the wallet pill, month chips and the income/expense pair. Below, the
 * wallet strip, the day-by-day ledger, and the Advisor card with the coach
 * duo. Every block stacks vertically — nothing floats over anything else.
 */
export function HomeScreen() {
  const finance = useFinance();
  const ui = useUI();
  const navigation = useNavigation();
  const { t, isDark } = useTheme();
  const { contentWidth } = useResponsive();
  const [ym, setYm] = useState(currentMonthKey());

  const totals = useMemo(() => totalsForMonth(finance.transactions, ym), [finance.transactions, ym]);
  const monthTxs = useMemo(
    () => finance.transactions.filter((tx) => monthKey(tx.date) === ym),
    [finance.transactions, ym]
  );
  const walletsTotal = useMemo(
    () => finance.accounts.reduce((sum, a) => sum + accountBalance(a, finance.transactions), 0),
    [finance.accounts, finance.transactions]
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Good night,';
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  const heroInk = '#FFFFFF';
  const heroSub = 'rgba(240,248,243,0.72)';
  const actionBg = 'rgba(255,255,255,0.14)';
  const balanceTone = totals.net >= 0 ? heroInk : '#FFC9CD';

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader bare tone="deep">
          {/* greeting row — avatar, name, quick actions */}
          <View style={styles.topRow}>
            <View style={styles.mascotBubble}>
              <Image source={require('../../assets/mascot-wave.png')} style={styles.mascotImg} resizeMode="cover" />
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
              >
                <Ionicons name="scan-outline" size={18} color={heroInk} />
              </PressableScale>
              <PressableScale
                onPress={() => navigation.navigate('Settings' as never)}
                scaleTo={0.9}
                style={[styles.actionCircle, { backgroundColor: actionBg }]}
              >
                <Ionicons name="settings-outline" size={18} color={heroInk} />
              </PressableScale>
            </View>
          </View>

          {/* month balance — single column, never collides */}
          <View style={styles.balanceBlock}>
            <Text style={[styles.balanceLabel, { color: '#F0D492' }]}>
              {monthLabel(ym, false).toUpperCase()} NET BALANCE
            </Text>
            <Text
              style={[styles.balanceValue, { color: balanceTone }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {totals.net >= 0 ? '+' : '−'}
              {formatMoney(Math.abs(totals.net), finance.settings.currency)}
            </Text>
          </View>

          {/* wallets pill — one full-width row */}
          <PressableScale onPress={() => ui.openWallets()} scaleTo={0.97} style={styles.walletsPill}>
            <View style={[styles.walletsIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Ionicons name="wallet-outline" size={15} color={heroInk} />
            </View>
            <Text style={[styles.walletsLabel, { color: heroInk }]}>All wallets</Text>
            <View style={styles.walletsSpacer} />
            <Text style={[styles.walletsValue, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatMoney(walletsTotal, finance.settings.currency)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={heroSub} />
          </PressableScale>

          {/* month chips */}
          <View style={styles.chipsWrap}>
            <MonthChips ym={ym} onChange={setYm} variant="onGreen" />
          </View>

          {/* income / expenses summary */}
          <MonthSummary income={totals.income} expense={totals.expense} currency={finance.settings.currency} />
        </GradientHeader>

        <View style={[styles.body, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}>
          <Entrance delay={120}>
            <AccountsStrip />
          </Entrance>

          <Entrance delay={180}>
            <View style={styles.ledger}>
              <MonthTxList
                ym={ym}
                transactions={monthTxs}
                currency={finance.settings.currency}
                onPressTx={(tx) => ui.openEdit(tx)}
              />
            </View>
          </Entrance>

          {/* advisor teaser with the coach duo */}
          <Entrance delay={240}>
            <GlassCard style={styles.advisorRow} onPress={() => navigation.navigate('Advisor' as never)}>
              <View style={[styles.advisorIcon, { backgroundColor: 'rgba(30,122,80,0.12)' }]}>
                <Ionicons name="bulb-outline" size={17} color={t.ocean600} />
              </View>
              <View style={styles.advisorMid}>
                <Text style={[styles.advisorTitle, { color: t.text }]}>Advisor</Text>
                <Text style={[styles.advisorSub, { color: t.subtext }]} numberOfLines={1}>
                  Coaching and safe-to-spend, from your own numbers.
                </Text>
              </View>
              <Image source={require('../../assets/mascot-advisor.png')} style={styles.advisorMascot} resizeMode="contain" />
              <Ionicons name="chevron-forward" size={15} color={t.faint} />
            </GlassCard>
          </Entrance>
        </View>
      </ScrollView>
    </View>
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  mascotImg: { width: '100%', height: '100%' },
  topMid: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  hello: { fontFamily: font.medium, fontSize: 12.5 },
  userName: { fontFamily: font.display, fontSize: 20, marginTop: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBlock: { marginTop: spacing.xl },
  balanceLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.4 },
  balanceValue: {
    fontFamily: font.heavy,
    fontSize: 36,
    marginTop: 6,
    letterSpacing: 0.2,
    flexShrink: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  walletsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  walletsIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  walletsLabel: { fontFamily: font.bold, fontSize: 12.5, flexShrink: 1 },
  walletsSpacer: { flex: 1, width: 8 },
  walletsValue: { fontFamily: font.heavy, fontSize: 13.5, marginRight: 6, maxWidth: '55%' },
  chipsWrap: { marginTop: spacing.md },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 120 },
  ledger: { marginTop: spacing.sm },
  advisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    marginTop: spacing.lg,
  },
  advisorIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisorMid: { flex: 1, marginHorizontal: spacing.md },
  advisorTitle: { fontFamily: font.bold, fontSize: 14.5 },
  advisorSub: { fontFamily: font.medium, fontSize: 12, marginTop: 1 },
  advisorMascot: { width: 54, height: 40, marginLeft: spacing.sm },
});
