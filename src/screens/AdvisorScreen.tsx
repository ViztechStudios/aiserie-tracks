import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader, GlassCard } from '../components/GradientHeader';
import { InsightCard } from '../components/InsightCard';
import { DonutChart } from '../components/DonutChart';
import { BarChart } from '../components/BarChart';
import { useFinance } from '../store/FinanceContext';
import { colors, radius, spacing } from '../theme';
import { buildAdvisorReport, currentMonthKey, monthLabel, shiftMonth } from '../utils/stats';
import { formatMoney } from '../utils/money';

export function AdvisorScreen() {
  const finance = useFinance();
  const [ym, setYm] = useState(currentMonthKey());

  const report = useMemo(
    () => buildAdvisorReport(finance.transactions, ym, finance.settings.currency),
    [finance.transactions, ym, finance.settings.currency]
  );

  const savingsPct = Math.round(report.savingsRate * 100);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title="Finance Advisor" subtitle="Personal coaching from your own data">
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
          <View style={styles.rateCard}>
            <View style={styles.rateRow}>
              <View style={styles.rateItem}>
                <Text style={[styles.rateNum, { color: savingsPct >= 20 ? colors.good : savingsPct >= 0 ? colors.warn : colors.risk }]}>
                  {savingsPct}%
                </Text>
                <Text style={styles.rateLabel}>savings rate</Text>
              </View>
              <View style={styles.rateItem}>
                <Text style={styles.rateNum}>{formatMoney(report.dailyAvgExpense, finance.settings.currency)}</Text>
                <Text style={styles.rateLabel}>daily spend</Text>
              </View>
              <View style={styles.rateItem}>
                <Text style={styles.rateNum}>{report.categoryTotals.length}</Text>
                <Text style={styles.rateLabel}>categories used</Text>
              </View>
            </View>
          </View>

          {/* insights */}
          <Text style={styles.sectionTitle}>This month's coaching</Text>
          {report.insights.map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}

          <View style={{ marginTop: spacing.md }}>
            <DonutChart data={report.categoryTotals} currency={finance.settings.currency} />
          </View>
          <View style={{ marginTop: spacing.lg, marginBottom: 120 }}>
            <BarChart months={report.months} currency={finance.settings.currency} />
          </View>
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
  heroLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginBottom: 2 },
  heroValue: { color: colors.white, fontSize: 30, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  heroSub2: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, lineHeight: 18 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: spacing.md },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  rateCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  rateRow: { flexDirection: 'row' },
  rateItem: { flex: 1, alignItems: 'center' },
  rateNum: { color: colors.text, fontSize: 18, fontWeight: '900' },
  rateLabel: { color: colors.subtext, fontSize: 11, marginTop: 3 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginVertical: spacing.lg },
});
