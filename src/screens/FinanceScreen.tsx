import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { GlassCard } from '../components/GlassCard';
import { PressableScale } from '../components/PressableScale';
import { TasksPanel } from '../components/TasksPanel';
import { RecurringSection } from '../components/RecurringSection';
import { useFinance } from '../store/FinanceContext';
import { useBudgets } from '../store/BudgetsContext';
import { useBills } from '../store/BillsContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getCategory, EXPENSE_CATEGORIES } from '../data/categories';
import { accountBalance } from '../utils/accounts';
import { billsDueWithin, nextDueDate, daysUntil } from '../utils/bills';
import { categoryTotals, currentMonthKey, monthKey } from '../utils/stats';
import { formatMoney, parseAmount } from '../utils/money';
import { DEFAULT_ALERT_LEVELS, activeLevels } from '../utils/budgetAlerts';
import { Bill, Budget } from '../types';
import { font, radius, spacing } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

/**
 * Finance — know what is due before it is due: the Money Plan (cash to
 * assign across envelope budgets), upcoming bills with reminders, monthly
 * category budgets with progress, and the money-chores list.
 */
export function FinanceScreen() {
  const finance = useFinance();
  const budgets = useBudgets();
  const bills = useBills();
  const ui = useUI();
  const { t, shadow } = useTheme();
  const { contentWidth } = useResponsive();

  const [budgetModal, setBudgetModal] = useState<{ budget?: Budget } | null>(null);
  const [budgetCat, setBudgetCat] = useState('food');
  const [budgetCap, setBudgetCap] = useState('');
  const [budgetAlerts, setBudgetAlerts] = useState<number[]>(DEFAULT_ALERT_LEVELS);
  const [billModal, setBillModal] = useState<{ bill?: Bill } | null>(null);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDay, setBillDay] = useState('15');
  const [billEmoji, setBillEmoji] = useState('💡');

  const ym = currentMonthKey();

  const cash = useMemo(
    () => finance.accounts.reduce((sum, a) => sum + accountBalance(a, finance.transactions), 0),
    [finance.accounts, finance.transactions]
  );
  const assigned = useMemo(() => budgets.budgets.reduce((sum, b) => sum + b.cap, 0), [budgets.budgets]);
  const spentByCategory = useMemo(() => {
    const map = new Map(categoryTotals(finance.transactions, ym, 'expense').map((c) => [c.category.id, c.amount]));
    return map;
  }, [finance.transactions, ym]);

  const upcoming = useMemo(() => billsDueWithin(bills.bills, 7), [bills.bills]);
  const nextBill = useMemo(() => {
    if (bills.bills.length === 0) return null;
    return bills.bills
      .map((bill) => ({ bill, due: nextDueDate(bill), days: daysUntil(nextDueDate(bill)) }))
      .sort((a, b) => a.days - b.days)[0];
  }, [bills.bills]);

  const planPct = cash > 0 ? Math.min(assigned / cash, 1) : 0;

  // budget month summary — caps vs actual spending for the visible month
  const budgetSummary = useMemo(() => {
    const totalCap = budgets.budgets.reduce((s, b) => s + b.cap, 0);
    const totalSpent = budgets.budgets.reduce((s, b) => s + (spentByCategory.get(b.categoryId) ?? 0), 0);
    const over = budgets.budgets.filter((b) => (spentByCategory.get(b.categoryId) ?? 0) > b.cap).length;
    return { totalCap, totalSpent, over };
  }, [budgets.budgets, spentByCategory]);

  const openBudgetModal = (budget?: Budget) => {
    setBudgetCat(budget?.categoryId ?? 'food');
    setBudgetCap(budget ? String(budget.cap) : '');
    setBudgetAlerts(budget ? activeLevels(budget) : [...DEFAULT_ALERT_LEVELS]);
    setBudgetModal({ budget });
  };

  const submitBudget = () => {
    const cap = parseAmount(budgetCap);
    if (cap === null) {
      ui.toast('Enter a monthly cap greater than zero.');
      return;
    }
    const alerts = budgetAlerts.length === DEFAULT_ALERT_LEVELS.length && DEFAULT_ALERT_LEVELS.every((v) => budgetAlerts.includes(v)) ? undefined : budgetAlerts;
    if (budgetModal?.budget) {
      budgets.updateBudget({ ...budgetModal.budget, categoryId: budgetCat, cap, alerts });
      ui.toast('Budget saved.');
    } else {
      budgets.upsertBudget(budgetCat, cap, alerts);
    }
    setBudgetModal(null);
    setBudgetCap('');
  };

  const resetBudgetAlerts = () => {
    const b = budgetModal?.budget;
    if (!b) return;
    budgets.resetAlerts(b.id);
    ui.toast(`Alerts for the ${getCategory(b.categoryId)?.label ?? ''} budget reset — it will notify again at each threshold.`);
    setBudgetModal(null);
  };

  const removeBudget = (b: Budget) => {
    ui
      .confirm({
        title: `Remove the ${getCategory(b.categoryId)?.label ?? 'budget'} budget?`,
        message: 'Your transactions are untouched — only the monthly cap goes away.',
        confirmLabel: 'Remove',
        danger: true,
      })
      .then((ok) => {
        if (ok) budgets.removeBudget(b.id);
      });
  };

  const submitBill = () => {
    const amount = parseAmount(billAmount);
    const day = parseInt(billDay, 10);
    if (!billName.trim()) {
      ui.toast('Give the bill a name, e.g. "Meralco" or "Condo dues".');
      return;
    }
    if (amount === null) {
      ui.toast('Enter the usual amount for this bill.');
      return;
    }
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      ui.toast('Due day must be between 1 and 31.');
      return;
    }
    if (billModal?.bill) {
      bills.updateBill({ ...billModal.bill, name: billName.trim(), amount, dueDay: day, emoji: billEmoji });
    } else {
      bills.addBill({ name: billName.trim(), amount, dueDay: day, emoji: billEmoji });
    }
    setBillModal(null);
    setBillName('');
    setBillAmount('');
    setBillDay('15');
  };

  const removeBill = (b: Bill) => {
    ui
      .confirm({
        title: `Remove ${b.name}?`,
        message: 'The reminder goes away. Past transactions are untouched.',
        confirmLabel: 'Remove',
        danger: true,
      })
      .then((ok) => {
        if (ok) bills.removeBill(b.id);
      });
  };

  const heroInk = '#FFFFFF';
  const heroSub = 'rgba(240,248,243,0.72)';

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title="Finance" subtitle="Know what is due before it is due" tone="deep">
          {/* money plan */}
          <GlassCard hi tint={t.card} style={styles.planCard}>
            <View style={styles.planHead}>
              <View style={styles.planTitleWrap}>
                <Text style={[styles.planLabel, { color: t.sun500 }]}>Money plan</Text>
                <Text style={[styles.planCash, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {formatMoney(Math.max(cash - assigned, 0), finance.settings.currency)}
                </Text>
                <Text style={[styles.planSub, { color: t.subtext }]}>
                  left to assign from {formatMoney(Math.max(cash, 0), finance.settings.currency)}
                </Text>
              </View>
              <View style={[styles.planBadge, { backgroundColor: t.goldWash }]}>
                <Ionicons name="leaf" size={16} color={t.warn} />
                <Text style={[styles.planBadgeText, { color: t.warn }]}>
                  {budgets.budgets.length} envelope{budgets.budgets.length === 1 ? '' : 's'}
                </Text>
              </View>
            </View>
            <View style={[styles.planTrack, { backgroundColor: t.ice100 }]}>
              <View style={[styles.planFill, { width: `${Math.round(planPct * 100)}%` as `${number}%`, backgroundColor: '#1E7A50' }]} />
            </View>
            <View style={styles.planLegendRow}>
              <Text style={[styles.planLegend, { color: t.subtext }]}>
                {assigned > 0
                  ? `${formatMoney(assigned, finance.settings.currency)} assigned · ${Math.round(planPct * 100)}% of cash`
                  : 'Assign cash to envelopes below — budgets, bills, savings.'}
              </Text>
            </View>
          </GlassCard>
        </GradientHeader>

        <View style={[styles.body, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}>
          {/* upcoming bills */}
          <Entrance delay={80}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Upcoming bills</Text>
              <Text style={[styles.sectionHint, { color: t.subtext }]}>
                {nextBill
                  ? `${formatMoney(upcoming.reduce((s, u) => s + u.bill.amount, 0), finance.settings.currency)} due in the next 7 days`
                  : 'Add the bills that repeat every month'}
              </Text>
            </View>

            {bills.bills.length === 0 ? (
              <GlassCard style={styles.addTile}>
                <Text style={[styles.emptyText, { color: t.subtext }]}>
                  Rent, internet, electricity, subscriptions — add them once and Finance reminds you before each one is due.
                </Text>
                <PressableScale onPress={() => setBillModal({})} haptic="medium" style={[styles.primaryBtn, { backgroundColor: '#1E7A50' }]}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Add a bill</Text>
                </PressableScale>
              </GlassCard>
            ) : (
              <>
                {upcoming.length > 0 ? (
                  <GlassCard hi tint={t.card} style={styles.dueCard}>
                    <View style={[styles.dueDot, { backgroundColor: t.expense }]} />
                    <View style={styles.dueMid}>
                      <Text style={[styles.dueTitle, { color: t.text }]}>
                        {nextBill?.bill.name} is next — {nextBill?.days === 0 ? 'due today' : `in ${nextBill?.days} day${nextBill?.days === 1 ? '' : 's'}`}
                      </Text>
                      <Text style={[styles.dueSub, { color: t.subtext }]} numberOfLines={1}>
                        {nextBill?.due} · {formatMoney(nextBill?.bill.amount ?? 0, finance.settings.currency)}
                      </Text>
                    </View>
                    <Ionicons name="notifications" size={18} color={t.warn} />
                  </GlassCard>
                ) : null}
                {bills.bills
                  .slice()
                  .sort((a, b) => daysUntil(nextDueDate(a)) - daysUntil(nextDueDate(b)))
                  .map((b) => {
                    const due = nextDueDate(b);
                    const days = daysUntil(due);
                    return (
                      <View key={b.id} style={[styles.billRow, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                        <Text style={styles.billEmoji}>{b.emoji ?? '💡'}</Text>
                        <View style={styles.billMid}>
                          <Text style={[styles.billName, { color: t.text }]} numberOfLines={1}>
                            {b.name}
                          </Text>
                          <Text style={[styles.billSub, { color: t.subtext }]} numberOfLines={1}>
                            Every month on the {b.dueDay}
                            {b.dueDay === 1 ? 'st' : b.dueDay === 2 ? 'nd' : b.dueDay === 3 ? 'rd' : 'th'} · {due}
                            {days <= 7 ? ` · ${days === 0 ? 'due today' : `in ${days} day${days === 1 ? '' : 's'}`}` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.billAmount, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {formatMoney(b.amount, finance.settings.currency)}
                        </Text>
                        <PressableScale onPress={() => setBillModal({ bill: b })} haptic="light" scaleTo={0.85} style={styles.rowIconBtn}>
                          <Ionicons name="pencil" size={15} color={t.subtext} />
                        </PressableScale>
                        <PressableScale onPress={() => removeBill(b)} haptic="light" scaleTo={0.85} style={styles.rowIconBtn}>
                          <Ionicons name="trash-outline" size={15} color={t.faint} />
                        </PressableScale>
                      </View>
                    );
                  })}
                <PressableScale onPress={() => setBillModal({})} haptic="light" style={styles.ghostBtn}>
                  <Ionicons name="add" size={15} color={t.ocean600} />
                  <Text style={[styles.ghostBtnText, { color: t.ocean600 }]}>Add another bill</Text>
                </PressableScale>
              </>
            )}
          </Entrance>

          {/* budgets */}
          <Entrance delay={140}>
            <View style={[styles.sectionHead, styles.sectionSpacing]}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Envelope budgets</Text>
              <Text style={[styles.sectionHint, { color: t.subtext }]}>
                {budgets.budgets.length > 0
                  ? `${formatMoney(budgetSummary.totalSpent, finance.settings.currency)} of ${formatMoney(budgetSummary.totalCap, finance.settings.currency)} · ${formatMoney(Math.max(budgetSummary.totalCap - budgetSummary.totalSpent, 0), finance.settings.currency)} left${budgetSummary.over > 0 ? ` · ${budgetSummary.over} over` : ''}`
                  : 'this month · caps per category'}
              </Text>
            </View>

            {budgets.budgets.length === 0 ? (
              <GlassCard style={styles.addTile}>
                <Text style={[styles.emptyText, { color: t.subtext }]}>
                  Give every peso a job: set a monthly cap per category and watch the envelopes fill up as you spend.
                </Text>
                <PressableScale onPress={() => openBudgetModal()} haptic="medium" style={[styles.primaryBtn, { backgroundColor: '#1E7A50' }]}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Create a budget</Text>
                </PressableScale>
              </GlassCard>
            ) : (
              <>
                {budgets.budgets
                  .slice()
                  .sort((a, b) => {
                    const sa = spentByCategory.get(a.categoryId) ?? 0;
                    const sb = spentByCategory.get(b.categoryId) ?? 0;
                    return sb / b.cap - sa / a.cap;
                  })
                  .map((b) => {
                    const cat = getCategory(b.categoryId);
                    const spent = spentByCategory.get(b.categoryId) ?? 0;
                    const pct = b.cap > 0 ? spent / b.cap : 0;
                    const left = b.cap - spent;
                    const tone = pct > 1 ? t.expense : pct > 0.75 ? t.warn : t.income;
                    return (
                      <View key={b.id} style={[styles.budgetCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                        <View style={styles.budgetHead}>
                          <View style={[styles.budgetEmoji, { backgroundColor: (cat?.color ?? '#94A3B8') + '1E' }]}>
                            <Text style={styles.budgetEmojiText}>{cat?.emoji ?? '⭐'}</Text>
                          </View>
                          <View style={styles.budgetMid}>
                            <Text style={[styles.budgetName, { color: t.text }]} numberOfLines={1}>
                              {cat?.label ?? 'Category'}
                            </Text>
                            <Text style={[styles.budgetSub, { color: tone }]} numberOfLines={1}>
                              {pct > 1
                                ? `${formatMoney(spent - b.cap, finance.settings.currency)} over the cap`
                                : `${formatMoney(left, finance.settings.currency)} left`}
                              {' · '}
                              {Math.round(pct * 100)}% of {formatMoney(b.cap, finance.settings.currency)}
                            </Text>
                          </View>
                          <PressableScale onPress={() => openBudgetModal(b)} haptic="light" scaleTo={0.85} style={styles.rowIconBtn}>
                            <Ionicons name="pencil" size={15} color={t.subtext} />
                          </PressableScale>
                          <PressableScale onPress={() => removeBudget(b)} haptic="light" scaleTo={0.85} style={styles.rowIconBtn}>
                            <Ionicons name="trash-outline" size={15} color={t.faint} />
                          </PressableScale>
                        </View>
                        <View style={[styles.planTrack, { backgroundColor: t.ice100 }]}>
                          <View
                            style={[
                              styles.planFill,
                              {
                                width: `${Math.round(Math.min(pct, 1) * 100)}%` as `${number}%`,
                                backgroundColor: tone,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                <PressableScale onPress={() => openBudgetModal()} haptic="light" style={styles.ghostBtn}>
                  <Ionicons name="add" size={15} color={t.ocean600} />
                  <Text style={[styles.ghostBtnText, { color: t.ocean600 }]}>New envelope</Text>
                </PressableScale>
              </>
            )}
          </Entrance>

          {/* recurring */}
          <RecurringSection />

          {/* money chores */}
          <Entrance delay={200}>
            <View style={[styles.sectionHead, styles.sectionSpacing]}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Money chores</Text>
              <Text style={[styles.sectionHint, { color: t.subtext }]}>little tasks, big peace of mind</Text>
            </View>
            <TasksPanel />
          </Entrance>
        </View>
      </ScrollView>

      {/* budget modal */}
      <Modal visible={budgetModal !== null} transparent animationType="slide" onRequestClose={() => setBudgetModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: t.cardSolid }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>{budgetModal?.budget ? 'Edit envelope' : 'New envelope'}</Text>
            <Text style={[styles.modalSection, { color: t.subtext }]}>CATEGORY</Text>
            <View style={styles.modalChips}>
              {EXPENSE_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setBudgetCat(c.id)}
                  style={[
                    styles.modalChip,
                    { backgroundColor: t.ice50, borderColor: t.line },
                    budgetCat === c.id && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                >
                  <Text style={[styles.modalChipText, { color: t.text }, budgetCat === c.id && { color: '#FFFFFF' }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.modalSection, { color: t.subtext }]}>MONTHLY CAP</Text>
            <View style={[styles.modalAmount, { backgroundColor: t.ice50, borderColor: t.ocean600 }]}>
              <Text style={[styles.modalCurrency, { color: t.ocean600 }]}>{finance.settings.currency === 'PHP' ? '₱' : finance.settings.currency}</Text>
              <TextInput
                style={[styles.modalAmountInput, { color: t.text }]}
                value={budgetCap}
                onChangeText={setBudgetCap}
                placeholder={budgetModal?.budget ? String(budgetModal.budget.cap) : '0.00'}
                placeholderTextColor={t.faint}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <Text style={[styles.modalSection, { color: t.subtext }]}>NOTIFY ME AT</Text>
            <View style={styles.modalChips}>
              {([
                [0.5, '50%'],
                [0.75, '75%'],
                [0.9, '90%'],
                [1, '100%'],
              ] as const).map(([lv, label]) => {
                const on = budgetAlerts.includes(lv);
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setBudgetAlerts((prev) => (on ? prev.filter((v) => v !== lv) : [...prev, lv].sort((a, b) => a - b)))}
                    style={[styles.modalChip, { backgroundColor: t.ice50, borderColor: t.line }, on && { backgroundColor: t.ocean600, borderColor: t.ocean600 }]}
                  >
                    <Text style={[styles.modalChipText, { color: t.text }, on && { color: '#FFFFFF' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {budgetModal?.budget && (
              <PressableScale onPress={resetBudgetAlerts} haptic="light" style={styles.resetBtn}>
                <Ionicons name="refresh" size={14} color={t.subtext} />
                <Text style={[styles.resetBtnText, { color: t.subtext }]}>Reset alerts for this month</Text>
              </PressableScale>
            )}
            <View style={styles.modalActions}>
              <PressableScale onPress={() => setBudgetModal(null)} haptic="light" style={[styles.modalBtn, { backgroundColor: t.ice100 }]} containerStyle={styles.modalBtnContainer}>
                <Text style={[styles.modalBtnText, { color: t.text }]}>Cancel</Text>
              </PressableScale>
              <PressableScale onPress={submitBudget} haptic="medium" style={[styles.modalBtn, { backgroundColor: '#1E7A50' }]} containerStyle={styles.modalBtnContainer}>
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{budgetModal?.budget ? 'Save' : 'Create'}</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* bill modal */}
      <Modal visible={billModal !== null} transparent animationType="slide" onRequestClose={() => setBillModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: t.cardSolid }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>{billModal?.bill ? 'Edit bill' : 'New bill'}</Text>
            <Text style={[styles.modalSection, { color: t.subtext }]}>NAME</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
              value={billName}
              onChangeText={setBillName}
              placeholder={billModal?.bill ? billModal.bill.name : 'e.g. Meralco, Converge, Condo dues'}
              placeholderTextColor={t.faint}
              maxLength={40}
            />
            <Text style={[styles.modalSection, { color: t.subtext }]}>USUAL AMOUNT</Text>
            <View style={[styles.modalAmount, { backgroundColor: t.ice50, borderColor: t.ocean600 }]}>
              <Text style={[styles.modalCurrency, { color: t.ocean600 }]}>{finance.settings.currency === 'PHP' ? '₱' : finance.settings.currency}</Text>
              <TextInput
                style={[styles.modalAmountInput, { color: t.text }]}
                value={billAmount}
                onChangeText={setBillAmount}
                placeholder={billModal?.bill ? String(billModal.bill.amount) : '0.00'}
                placeholderTextColor={t.faint}
                keyboardType="numeric"
                autoFocus={!billModal?.bill}
              />
            </View>
            <View style={styles.billFormRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalSection, { color: t.subtext }]}>DUE DAY (1-31)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
                  value={billDay}
                  onChangeText={(v) => setBillDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="15"
                  placeholderTextColor={t.faint}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalSection, { color: t.subtext }]}>ICON</Text>
                <View style={styles.emojiRow}>
                  {['💡', '🏠', '📶', '💧', '🏋️', '📺'].map((e) => (
                    <TouchableOpacity key={e} onPress={() => setBillEmoji(e)} style={[styles.emojiChip, billEmoji === e && { backgroundColor: t.ice100 }]}>
                      <Text style={styles.emojiText}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.modalActions}>
              <PressableScale onPress={() => setBillModal(null)} haptic="light" style={[styles.modalBtn, { backgroundColor: t.ice100 }]} containerStyle={styles.modalBtnContainer}>
                <Text style={[styles.modalBtnText, { color: t.text }]}>Cancel</Text>
              </PressableScale>
              <PressableScale onPress={submitBill} haptic="medium" style={[styles.modalBtn, { backgroundColor: '#1E7A50' }]} containerStyle={styles.modalBtnContainer}>
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{billModal?.bill ? 'Save' : 'Add bill'}</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  planCard: { borderRadius: radius.lg, padding: spacing.lg },
  planHead: { flexDirection: 'row', alignItems: 'flex-start' },
  planTitleWrap: { flex: 1, marginRight: spacing.md },
  planLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2 },
  planCash: { fontFamily: font.heavy, fontSize: 30, marginTop: 6, maxWidth: '100%' },
  planSub: { fontFamily: font.medium, fontSize: 12, marginTop: 4 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  planBadgeText: { fontFamily: font.bold, fontSize: 11.5 },
  planTrack: { height: 8, borderRadius: radius.pill, marginTop: spacing.lg, overflow: 'hidden' },
  planFill: { height: '100%', borderRadius: radius.pill },
  planLegendRow: { marginTop: spacing.md },
  planLegend: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 16 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 120 },
  sectionHead: { marginTop: spacing.sm, marginBottom: spacing.md },
  sectionSpacing: { marginTop: spacing.xl },
  sectionTitle: { fontFamily: font.display, fontSize: 18 },
  sectionHint: { fontFamily: font.medium, fontSize: 11.5, marginTop: 2 },
  addTile: { borderRadius: radius.lg, padding: spacing.lg },
  emptyText: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  primaryBtnText: { fontFamily: font.bold, fontSize: 14, color: '#FFFFFF' },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dueDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  dueMid: { flex: 1, marginRight: spacing.sm },
  dueTitle: { fontFamily: font.bold, fontSize: 14 },
  dueSub: { fontFamily: font.medium, fontSize: 11.5, marginTop: 2 },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  billEmoji: { fontSize: 22, marginRight: spacing.md },
  billMid: { flex: 1, marginRight: spacing.sm },
  billName: { fontFamily: font.bold, fontSize: 14.5 },
  billSub: { fontFamily: font.medium, fontSize: 11.5, marginTop: 2 },
  billAmount: { fontFamily: font.bold, fontSize: 14, marginRight: 4, maxWidth: 110 },
  rowIconBtn: { padding: 6 },
  budgetCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  budgetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  budgetEmoji: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  budgetEmojiText: { fontSize: 17 },
  budgetMid: { flex: 1, marginRight: spacing.sm },
  budgetName: { fontFamily: font.bold, fontSize: 14.5 },
  budgetSub: { fontFamily: font.bold, fontSize: 11.5, marginTop: 2 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(30,122,80,0.4)',
    marginBottom: spacing.md,
  },
  ghostBtnText: { fontFamily: font.bold, fontSize: 13 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start' },
  resetBtnText: { fontFamily: font.bold, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,16,10,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl + 8,
    maxHeight: '88%',
  },
  modalTitle: { fontFamily: font.display, fontSize: 20, marginBottom: spacing.md },
  modalSection: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm },
  modalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5 },
  modalChipText: { fontFamily: font.medium, fontSize: 13 },
  modalAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalCurrency: { fontFamily: font.heavy, fontSize: 22, marginRight: 10 },
  modalAmountInput: { flex: 1, fontFamily: font.heavy, fontSize: 24, paddingVertical: 4 },
  modalInput: { borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.md, fontSize: 15, fontFamily: font.medium },
  billFormRow: { flexDirection: 'row', gap: spacing.md },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  emojiChip: { paddingVertical: 7, paddingHorizontal: 9, borderRadius: 12 },
  emojiText: { fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalBtnContainer: { flex: 1 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  modalBtnText: { fontFamily: font.bold, fontSize: 15 },
});
