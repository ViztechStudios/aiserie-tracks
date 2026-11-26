import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { MonthChips } from '../components/MonthChips';
import { TransactionRow } from '../components/TransactionRow';
import { DonutChart } from '../components/DonutChart';
import { BarChart } from '../components/BarChart';
import { GlassCard } from '../components/GlassCard';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getCategory } from '../data/categories';
import { buildAdvisorReport, categoryTotals, daysInMonth, monthKey, monthLabel, shiftMonth, todayISO, totalsForMonth } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { font, radius, spacing } from '../theme';
import { Transaction } from '../types';
import { useResponsive } from '../hooks/useResponsive';

type HeatMetric = 'spending' | 'net';

/**
 * Insights — plain answers about your money, Boop-style, in the fern voice:
 * one honest headline, the IN/OUT/kept trio, "Aiserie noticed" cards, the
 * safe-to-spend nudge with the coach duo, and a day-by-day heatmap you can
 * tap to open any day.
 */
export function InsightsScreen() {
  const finance = useFinance();
  const ui = useUI();
  const { t, isDark, shadow } = useTheme();
  const { contentWidth } = useResponsive();
  const [ym, setYm] = useState(monthKey(todayISO()));
  const [metric, setMetric] = useState<HeatMetric>('spending');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [gridW, setGridW] = useState(0);

  const report = useMemo(() => buildAdvisorReport(finance.transactions, ym, finance.settings.currency), [finance.transactions, ym, finance.settings.currency]);
  const totals = useMemo(() => totalsForMonth(finance.transactions, ym), [finance.transactions, ym]);

  /** Category movers vs the previous month — the "noticed" cards. */
  const movers = useMemo(() => {
    const prevYm = shiftMonth(ym, -1);
    const prev = new Map(categoryTotals(finance.transactions, prevYm, 'expense').map((c) => [c.category.id, c.amount]));
    return categoryTotals(finance.transactions, ym, 'expense')
      .map((c) => {
        const before = prev.get(c.category.id);
        const delta = before !== undefined ? c.amount - before : null;
        return { ...c, before, delta };
      })
      .filter((c) => c.delta !== null && Math.abs(c.delta as number) > 0)
      .sort((a, b) => Math.abs(b.delta as number) - Math.abs(a.delta as number))
      .slice(0, 2);
  }, [finance.transactions, ym]);

  /** Heatmap data: per-day expense / net for the selected month. */
  const heat = useMemo(() => {
    const dim = daysInMonth(ym);
    const perDay = new Map<string, { expense: number; income: number }>();
    for (const tx of finance.transactions) {
      if (monthKey(tx.date) !== ym || tx.type === 'transfer') continue;
      const cur = perDay.get(tx.date) ?? { expense: 0, income: 0 };
      if (tx.type === 'expense') cur.expense += tx.amount;
      else cur.income += tx.amount;
      perDay.set(tx.date, cur);
    }
    const days: { date: string; value: number; income: number; expense: number }[] = [];
    for (let d = 1; d <= dim; d++) {
      const date = `${ym}-${String(d).padStart(2, '0')}`;
      const v = perDay.get(date) ?? { expense: 0, income: 0 };
      days.push({ date, income: v.income, expense: v.expense, value: metric === 'spending' ? v.expense : v.income - v.expense });
    }
    const max = Math.max(...days.map((d) => Math.abs(d.value)), 1);
    const [y, m] = ym.split('-').map(Number);
    const firstDow = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
    return { days, max, firstDow, dim };
  }, [finance.transactions, ym, metric]);

  const selectedTxs = useMemo<Transaction[]>(
    () => (selectedDay ? finance.transactions.filter((tx) => tx.date === selectedDay) : []),
    [finance.transactions, selectedDay]
  );

  const dailyAvg = report.dailyAvgExpense;
  const zeroDays = useMemo(() => {
    if (ym !== monthKey(todayISO())) return null;
    let count = 0;
    const spentDays = new Set(finance.transactions.filter((tx) => tx.type === 'expense' && monthKey(tx.date) === ym).map((tx) => tx.date));
    for (let d = 1; d <= new Date().getDate(); d++) {
      const date = `${ym}-${String(d).padStart(2, '0')}`;
      if (!spentDays.has(date)) count += 1;
    }
    return count;
  }, [finance.transactions, ym]);

  /** The one plain-language headline, Boop-style. */
  const headline = useMemo(() => {
    const isCurrent = ym === monthKey(todayISO());
    const prevYm = shiftMonth(ym, -1);
    const prevTotals = totalsForMonth(finance.transactions, prevYm);
    const prevDim = daysInMonth(prevYm);
    const comparable = isCurrent ? Math.min(new Date().getDate(), daysInMonth(ym)) : daysInMonth(ym);
    const prevToSamePoint = prevTotals.expense * (prevDim > 0 ? comparable / prevDim : 0);
    const diff = totals.expense - prevToSamePoint;
    const fmt = (n: number) => formatMoney(Math.abs(n), finance.settings.currency);
    const when = isCurrent ? 'so far this month' : `in ${monthLabel(ym, true)}`;

    if (prevTotals.expense === 0 && totals.expense === 0) {
      return `Nothing logged ${when} — add your first entry and the answers start here.`;
    }
    if (prevTotals.expense === 0) {
      return `You spent ${fmt(totals.expense)} ${when}. No spending recorded last month — this is your baseline.`;
    }
    if (diff > 1) {
      return `You spent ${fmt(totals.expense)} ${when} — ${fmt(diff)} more than the same stretch last month.`;
    }
    if (diff < -1) {
      return `You spent ${fmt(totals.expense)} ${when} — ${fmt(diff)} less than the same stretch last month. Keep it up.`;
    }
    return `You spent ${fmt(totals.expense)} ${when} — right on pace with last month.`;
  }, [finance.transactions, ym, totals.expense, finance.settings.currency]);

  const heroInk = '#FFFFFF';
  const heroSub = 'rgba(240,248,243,0.72)';
  const kept = totals.income - totals.expense;
  const keptPct = totals.income > 0 ? Math.round((kept / totals.income) * 100) : 0;
  /** Fixed heatmap cell size from the measured grid width (percent widths
   *  + aspectRatio collapse on react-native-web, so we compute pixels). */
  const cell = gridW > 0 ? Math.floor((gridW - 6 * 4) / 7) : 0;

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title="Insights" subtitle="Plain answers about your money" tone="deep">
          {/* month chips */}
          <View style={styles.chipsWrap}>
            <MonthChips ym={ym} onChange={(v) => { setYm(v); setSelectedDay(null); }} variant="onGreen" />
          </View>

          {/* headline */}
          <Text style={[styles.headline, { color: heroInk }]}>{headline}</Text>

          {/* IN / OUT / kept trio */}
          <View style={styles.trio}>
            <View style={[styles.trioCard, { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.16)' }]}>
              <Text style={[styles.trioLabel, { color: heroSub }]}>IN</Text>
              <Text style={[styles.trioValue, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatMoney(totals.income, finance.settings.currency)}
              </Text>
            </View>
            <View style={[styles.trioCard, { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.16)' }]}>
              <Text style={[styles.trioLabel, { color: heroSub }]}>OUT</Text>
              <Text style={[styles.trioValue, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatMoney(totals.expense, finance.settings.currency)}
              </Text>
            </View>
            <View style={[styles.trioCard, { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.16)' }]}>
              <Text style={[styles.trioLabel, { color: heroSub }]}>KEPT</Text>
              <Text style={[styles.trioValue, { color: kept >= 0 ? '#BFF0D3' : '#FFC9CD' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {totals.income > 0 ? `${keptPct}%` : '—'}
              </Text>
            </View>
          </View>
        </GradientHeader>

        <View style={[styles.body, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}>
          {/* safe to spend — with the coach duo */}
          {report.safeToSpendPerDay !== null ? (
            <Entrance delay={80}>
              <GlassCard hi tint={t.card} style={styles.safeCard}>
                <Text style={[styles.safeLabel, { color: t.sun500 }]}>Safe to spend per day</Text>
                <Text style={[styles.safeValue, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                  {formatMoney(report.safeToSpendPerDay, finance.settings.currency)}
                </Text>
                <Text style={[styles.safeBody, { color: t.subtext }]}>
                  Spread over the {report.daysRemaining} day{report.daysRemaining === 1 ? '' : 's'} left in {monthLabel(ym, true)} — keeps you even by the 30th.
                </Text>
                <View style={styles.duoWrap}>
                  <View style={styles.duoCard}>
                    <Image2 />
                  </View>
                </View>
              </GlassCard>
            </Entrance>
          ) : null}

          {/* daily rhythm */}
          <Entrance delay={120}>
            <View style={[styles.rhythmRow, contentWidth ? { maxWidth: contentWidth } : null]}>
              <View style={[styles.rhythmCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                <Text style={[styles.rhythmValue, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {formatMoney(dailyAvg, finance.settings.currency)}
                </Text>
                <Text style={[styles.rhythmLabel, { color: t.subtext }]}>average daily spend</Text>
              </View>
              <View style={[styles.rhythmCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                <Text style={[styles.rhythmValue, { color: t.text }]}>{zeroDays === null ? '—' : `${zeroDays}`}</Text>
                <Text style={[styles.rhythmLabel, { color: t.subtext }]}>zero-spend days</Text>
              </View>
              <View style={[styles.rhythmCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                <Text style={[styles.rhythmValue, { color: t.text }]}>
                  {totals.income > 0 ? `${keptPct}%` : '—'}
                </Text>
                <Text style={[styles.rhythmLabel, { color: t.subtext }]}>of income kept</Text>
              </View>
            </View>
          </Entrance>

          {/* Aiserie noticed */}
          {movers.length > 0 ? (
            <Entrance delay={160}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: t.text }]}>Aiserie noticed</Text>
                <Text style={[styles.sectionHint, { color: t.subtext }]}>category changes vs {monthLabel(shiftMonth(ym, -1), true)}</Text>
              </View>
              {movers.map((m) => {
                const up = (m.delta as number) > 0;
                const pct = m.before && m.before > 0 ? Math.round((Math.abs(m.delta as number) / m.before) * 100) : null;
                return (
                  <View
                    key={m.category.id}
                    style={[styles.moverCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}
                  >
                    <View style={[styles.moverIcon, { backgroundColor: up ? t.expense + '14' : t.income + '14' }]}>
                      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={18} color={up ? t.expense : t.income} />
                    </View>
                    <View style={styles.moverMid}>
                      <Text style={[styles.moverTitle, { color: t.text }]} numberOfLines={1}>
                        {m.category.emoji} {m.category.label} {up ? 'up' : 'down'}
                        {pct ? ` ${pct}%` : ''}
                      </Text>
                      <Text style={[styles.moverBody, { color: t.subtext }]} numberOfLines={2}>
                        {formatMoney(m.amount, finance.settings.currency)} this month · was{' '}
                        {formatMoney(m.before as number, finance.settings.currency)} last month.
                        {up ? ' Worth a quick look.' : ' Whatever you changed, keep doing it.'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Entrance>
          ) : null}

          {/* day-by-day heatmap */}
          <Entrance delay={200}>
            <View style={[styles.heatCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
              <View style={styles.heatHead}>
                <Text style={[styles.heatTitle, { color: t.text }]}>Day by day</Text>
                <View style={[styles.heatToggle, { backgroundColor: t.ice100 }]}>
                  {(['spending', 'net'] as HeatMetric[]).map((m) => {
                    const on = metric === m;
                    return (
                      <PressableScale key={m} onPress={() => setMetric(m)} haptic={on ? false : 'light'} scaleTo={0.94} style={styles.heatToggleBtn}>
                        <Text style={[styles.heatToggleText, { color: on ? '#FFFFFF' : t.subtext }, on && styles.heatToggleOn]}>
                          {m === 'spending' ? 'Spending' : 'Net'}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              <View
                style={styles.heatGrid}
                onLayout={(e) => setGridW(e.nativeEvent.layout.width)}
              >
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={[styles.heatDow, { color: t.faint, width: cell }]}>
                    {d}
                  </Text>
                ))}
                {Array.from({ length: heat.firstDow }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ width: cell }} />
                ))}
                {heat.days.map((d) => {
                  const intensity = d.value === 0 ? 0 : Math.min(Math.abs(d.value) / heat.max, 1);
                  const negative = metric === 'net' && d.value < 0;
                  const on = selectedDay === d.date;
                  const bg =
                    d.value === 0
                      ? t.ice100
                      : negative
                        ? mixExp(t.expense, intensity)
                        : metric === 'spending'
                          ? mixExp(t.expense, intensity)
                          : mixExp(t.income, intensity);
                  const ink = intensity > 0.45 ? '#FFFFFF' : t.text;
                  return (
                    <PressableScale key={d.date} onPress={() => setSelectedDay(on ? null : d.date)} haptic="light" scaleTo={0.9}>
                      <View
                        style={[
                          styles.heatCell,
                          { backgroundColor: bg, width: cell, height: cell },
                          on && { borderColor: t.ocean600 },
                        ]}
                      >
                        <Text style={[styles.heatCellText, { color: ink }]}>{Number(d.date.slice(-2))}</Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
              <Text style={[styles.heatHint, { color: t.faint }]} numberOfLines={1}>
                {metric === 'spending' ? 'Darker means more spent that day.' : 'Green is a plus day, red is a minus day.'} Tap a day to open it.
              </Text>
            </View>
          </Entrance>

          {/* selected day list */}
          {selectedDay && selectedTxs.length > 0 ? (
            <Entrance delay={60}>
              <View style={styles.dayListWrap}>
                {selectedTxs.map((tx) => {
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
                      tx={tx}
                      onPress={() => ui.openEdit(tx)}
                    />
                  );
                })}
              </View>
            </Entrance>
          ) : null}

          {/* where the money went */}
          <Entrance delay={240}>
            <View style={{ marginTop: spacing.lg }}>
              <DonutChart data={report.categoryTotals} currency={finance.settings.currency} />
            </View>
          </Entrance>

          {/* last 6 months */}
          <Entrance delay={280}>
            <View style={{ marginTop: spacing.lg }}>
              <BarChart months={report.months} currency={finance.settings.currency} />
            </View>
          </Entrance>
        </View>
      </ScrollView>
    </View>
  );
}

/** Tint a hex color toward white by `frac` (0..1) — heatmap shading. */
function mixExp(hex: string, frac: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * (1 - frac) * 0.72);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Coach duo mascot for the safe-to-spend card. */
function Image2() {
  return <Image source={require('../../assets/mascot-advisor.png')} style={styles.duoImg} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  chipsWrap: { marginTop: 0 },
  headline: {
    fontFamily: font.medium,
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: spacing.lg,
    maxWidth: '100%',
  },
  trio: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  trioCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md + 2,
  },
  trioLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.4 },
  trioValue: { fontFamily: font.heavy, fontSize: 17, marginTop: 5 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 120 },
  safeCard: { borderRadius: radius.lg, padding: spacing.lg },
  safeLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2 },
  safeValue: { fontFamily: font.heavy, fontSize: 30, marginTop: 6, alignSelf: 'flex-start', maxWidth: '70%' },
  safeBody: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, marginTop: 6, maxWidth: '72%' },
  duoWrap: { position: 'absolute', right: spacing.lg, bottom: spacing.md, alignItems: 'flex-end' },
  duoCard: {},
  duoImg: { width: 92, height: 66 },
  rhythmRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  rhythmCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rhythmValue: { fontFamily: font.heavy, fontSize: 15.5, maxWidth: '100%' },
  rhythmLabel: { fontFamily: font.medium, fontSize: 10, textAlign: 'center', marginTop: 3, lineHeight: 13 },
  sectionHead: { marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontFamily: font.display, fontSize: 18 },
  sectionHint: { fontFamily: font.medium, fontSize: 11, marginTop: 2 },
  moverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  moverIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moverMid: { flex: 1, marginLeft: spacing.md },
  moverTitle: { fontFamily: font.bold, fontSize: 14 },
  moverBody: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  heatCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  heatHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  heatTitle: { fontFamily: font.bold, fontSize: 16 },
  heatToggle: { flexDirection: 'row', borderRadius: radius.pill, padding: 3, gap: 2 },
  heatToggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  heatToggleText: { fontFamily: font.bold, fontSize: 11.5 },
  heatToggleOn: {},
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatDow: {
    textAlign: 'center',
    fontFamily: font.bold,
    fontSize: 10,
    marginBottom: 4,
  },
  heatCell: {
    borderRadius: 9,
    marginVertical: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 0,
  },
  heatCellText: { fontFamily: font.bold, fontSize: 11 },
  heatHint: { fontFamily: font.medium, fontSize: 10.5, marginTop: spacing.sm },
  dayListWrap: { marginTop: spacing.md },
});
