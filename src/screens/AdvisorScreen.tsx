import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { GlassCard } from '../components/GlassCard';
import { AuroraBackground } from '../components/AuroraBackground';
import { InsightCard } from '../components/InsightCard';
import { DonutChart } from '../components/DonutChart';
import { BarChart } from '../components/BarChart';
import { Entrance } from '../components/Entrance';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useTheme } from '../store/ThemeContext';
import { radius, spacing } from '../theme';
import { buildAdvisorReport, currentMonthKey, monthLabel, shiftMonth } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';

export function AdvisorScreen() {
  const finance = useFinance();
  const { t } = useTheme();
  const { contentWidth } = useResponsive();
  const [ym, setYm] = useState(currentMonthKey());

  const report = useMemo(
    () => buildAdvisorReport(finance.transactions, ym, finance.settings.currency),
    [finance.transactions, ym, finance.settings.currency]
  );

  const savingsPct = Math.round(report.savingsRate * 100);

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null}
      >
        <GradientHeader title="Finance Advisor" subtitle="Personal coaching from your own data">
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

          {/* hero: safe to spend */}
          <GlassCard>
            {ym === currentMonthKey() && report.safeToSpendPerDay !== null ? (
              <>
                <Text style={styles.heroLabel}>Safe to spend per day</Text>
                <Text style={styles.heroValue}>{formatMoney(report.safeToSpendPerDay, finance.settings.currency)}</Text>
                <Text style={styles.heroSub}>
                  over the last {report.daysRemaining} day{report.daysRemaining === 1 ? '' : 's'} of {monthLabel(ym, true)}
                </Text>
                <View style={styles.heroDivider} />
                <Text style={styles.heroSub2}>
                  At today's pace of {formatMoney(report.dailyAvgExpense, finance.settings.currency)}/day, you will finish
                  around {formatMoney(report.projectedExpense, finance.settings.currency)} for the month.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.heroLabel}>{monthLabel(ym, true)} summary</Text>
                <Text style={styles.heroValue}>
                  {formatMoney(report.net, finance.settings.currency)}
                </Text>
                <Text style={styles.heroSub}>
                  {formatMoney(report.income, finance.settings.currency)} in · {formatMoney(report.expense, finance.settings.currency)} out
                </Text>
              </>
            )}
          </GlassCard>
        </GradientHeader>

        <View style={styles.body}>
          {/* savings rate strip */}
          <Entrance delay={0}>
            <View style={[styles.rateCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <View style={styles.rateRow}>
                <View style={styles.rateItem}>
                  <Text style={[styles.rateNum, { color: savingsPct >= 20 ? t.good : savingsPct >= 0 ? t.warn : t.risk }]}>
                    {savingsPct}%
                  </Text>
                  <Text style={[styles.rateLabel, { color: t.subtext }]}>savings rate</Text>
                </View>
                <View style={styles.rateItem}>
                  <Text style={[styles.rateNum, { color: t.text }]}>{formatMoney(report.dailyAvgExpense, finance.settings.currency)}</Text>
                  <Text style={[styles.rateLabel, { color: t.subtext }]}>daily spend</Text>
                </View>
                <View style={styles.rateItem}>
                  <Text style={[styles.rateNum, { color: t.text }]}>{report.categoryTotals.length}</Text>
                  <Text style={[styles.rateLabel, { color: t.subtext }]}>categories used</Text>
                </View>
              </View>
            </View>
          </Entrance>

          {/* insights */}
          <Text style={[styles.sectionTitle, { color: t.text }]}>This month's coaching</Text>
          {report.insights.map((i, idx) => (
            <Entrance key={i.id} delay={60 + idx * 45}>
              <InsightCard insight={i} />
            </Entrance>
          ))}

          <Entrance delay={240}>
            <DonutChart data={report.categoryTotals} currency={finance.settings.currency} />
          </Entrance>
          <Entrance delay={300} style={{ marginTop: spacing.lg, marginBottom: 120 }}>
            <BarChart months={report.months} currency={finance.settings.currency} />
          </Entrance>
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
  heroLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginBottom: 2 },
  heroValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  heroSub2: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, lineHeight: 18 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: spacing.md },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  rateCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  rateRow: { flexDirection: 'row' },
  rateItem: { flex: 1, alignItems: 'center' },
  rateNum: { fontSize: 18, fontWeight: '900' },
  rateLabel: { fontSize: 11, marginTop: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginVertical: spacing.lg },
});
