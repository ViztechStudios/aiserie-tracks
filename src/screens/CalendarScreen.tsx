import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { MonthChips } from '../components/MonthChips';
import { MonthSummary } from '../components/MonthSummary';
import { MonthTxList } from '../components/MonthTxList';
import { MonthGrid } from '../components/MonthGrid';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { spacing, font } from '../theme';
import { currentMonthKey, monthKey, totalsForMonth } from '../utils/stats';
import { Transaction } from '../types';
import { useResponsive } from '../hooks/useResponsive';

/**
 * Calendar — month grid with marker dots above the day-by-day ledger.
 * Tap a day in the grid to focus the ledger on it; tap again to clear.
 */
export function CalendarScreen() {
  const finance = useFinance();
  const ui = useUI();
  const { t } = useTheme();
  const { contentWidth } = useResponsive();
  const [ym, setYm] = useState(currentMonthKey());
  const [day, setDay] = useState<string | null>(null);

  const monthTxs = useMemo(
    () => finance.transactions.filter((tx) => monthKey(tx.date) === ym),
    [finance.transactions, ym]
  );
  const totals = useMemo(() => totalsForMonth(finance.transactions, ym), [finance.transactions, ym]);

  const openTx = (tx: Transaction) => {
    ui.openEdit(tx);
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null}
      >
        <GradientHeader title="Calendar" subtitle="Every peso, day by day" tone="deep">
          <View style={styles.chipsWrap}>
            <MonthChips ym={ym} onChange={(v) => { setYm(v); setDay(null); }} variant="onGreen" />
          </View>
          <MonthSummary income={totals.income} expense={totals.expense} currency={finance.settings.currency} />
        </GradientHeader>

        <View style={styles.body}>
          <Entrance delay={100}>
            <MonthGrid
              ym={ym}
              transactions={monthTxs}
              selectedDay={day}
              onSelectDay={setDay}
            />
          </Entrance>

          <Entrance delay={160}>
            <View style={styles.listWrap}>
              <MonthTxList
                ym={ym}
                transactions={monthTxs}
                currency={finance.settings.currency}
                dayFilter={day}
                onClearDay={() => setDay(null)}
                onPressTx={(tx) => openTx(tx)}
                emptyIcon={day ? 'calendar-clear-outline' : 'calendar-outline'}
                emptyTitle={day ? 'Nothing on this day' : 'Nothing logged this month'}
                emptyBody={
                  day
                    ? 'No transactions on the selected day. Tap the day again to clear the filter.'
                    : 'Tap the + button to record your first transaction for this month.'
                }
              />
            </View>
          </Entrance>

          <Entrance delay={220}>
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={14} color={t.faint} />
              <Text style={[styles.hint, { color: t.faint }]}>
                Tap a transaction to edit it.
              </Text>
            </View>
          </Entrance>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  chipsWrap: { marginTop: spacing.lg },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 130 },
  listWrap: { marginTop: spacing.lg },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.md,
  },
  hint: { fontFamily: font.medium, fontSize: 12 },
});
