import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
 * Balance — the main page. Dawn-sky hero with the month balance, the month
 * chip strip, income/expenses summary cards, the wallet strip, then the
 * day-by-day ledger for the selected month.
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
  const initial = (finance.settings.userName || 'A').trim().charAt(0).toUpperCase() || 'A';
  const heroInk = isDark ? '#F2F6FA' : '#1A2B3C';
  const heroSub = isDark ? 'rgba(226,236,244,0.75)' : 'rgba(26,43,60,0.62)';
  const actionBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.62)';

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader bare>
          {/* identity row + quick actions */}
          <View style={styles.topRow}>
            <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(233,200,126,0.18)' : 'rgba(255,255,255,0.72)' }]}>
              <Text style={[styles.avatarText, { color: isDark ? t.sun300 : '#8A5A16' }]}>{initial}</Text>
            </View>
            <View style={styles.topMid}>
              <Text style={[styles.hello, { color: heroSub }]}>Good day,</Text>
              <Text style={[styles.userName, { color: heroInk }]}>{finance.settings.userName}</Text>
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

          {/* month balance */}
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <Text style={[styles.balanceLabel, { color: heroSub }]}>
                {monthLabel(ym, false).toUpperCase()} BALANCE
              </Text>
              <Text style={[styles.balanceValue, { color: totals.net >= 0 ? heroInk : t.expense }]} numberOfLines={1}>
                {totals.net >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(totals.net), finance.settings.currency)}
              </Text>
            </View>
            <View style={styles.balanceRight}>
              <Text style={[styles.walletsLabel, { color: heroSub }]}>WALLETS BALANCE</Text>
              <PressableScale onPress={() => ui.openWallets()} scaleTo={0.95}>
                <Text style={[styles.walletsValue, { color: heroInk }]} numberOfLines={1}>
                  {formatMoney(walletsTotal, finance.settings.currency)}
                </Text>
              </PressableScale>
            </View>
          </View>

          {/* month chips */}
          <View style={styles.chipsWrap}>
            <MonthChips ym={ym} onChange={setYm} />
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

          {/* advisor teaser */}
          <Entrance delay={240}>
            <GlassCard style={styles.advisorRow} onPress={() => navigation.navigate('Advisor' as never)}>
              <View style={[styles.advisorIcon, { backgroundColor: 'rgba(192,138,50,0.14)' }]}>
                <Ionicons name="bulb-outline" size={17} color={t.sun500} />
              </View>
              <View style={styles.advisorMid}>
                <Text style={[styles.advisorTitle, { color: t.text }]}>Advisor</Text>
                <Text style={[styles.advisorSub, { color: t.subtext }]} numberOfLines={1}>
                  Coaching and safe-to-spend, from your own numbers.
                </Text>
              </View>
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: font.displayBold, fontSize: 18 },
  topMid: { flex: 1, marginLeft: spacing.md },
  hello: { fontFamily: font.medium, fontSize: 12 },
  userName: { fontFamily: font.display, fontSize: 19, marginTop: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.xl,
  },
  balanceLeft: { flex: 1 },
  balanceLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.2 },
  balanceValue: { fontFamily: font.heavy, fontSize: 34, marginTop: 4, letterSpacing: 0.2 },
  balanceRight: { alignItems: 'flex-end', marginLeft: spacing.md },
  walletsLabel: { fontFamily: font.bold, fontSize: 9.5, letterSpacing: 1.2 },
  walletsValue: { fontFamily: font.bold, fontSize: 15, marginTop: 4 },
  chipsWrap: { marginTop: spacing.lg },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 120 },
  ledger: { marginTop: spacing.sm },
  advisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
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
});
