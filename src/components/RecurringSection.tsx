import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useRecurring } from '../store/RecurringContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { RecurFreq, Recurring } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategory } from '../data/categories';
import { formatMoney, parseAmount } from '../utils/money';
import { upcomingFor } from '../utils/recurring';
import { daysUntil } from '../utils/bills';
import { todayISO } from '../utils/stats';
import { font, radius, spacing } from '../theme';

const FREQS: { key: RecurFreq; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const FREQ_HINT: Record<RecurFreq, string> = {
  daily: 'logs once a day',
  weekly: 'logs every 7 days',
  monthly: 'logs once a month, same day',
  yearly: 'logs once a year, same date',
};

function fmtDate(iso: string | undefined | null): string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '—';
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Recurring transactions — schedule income and expenses that Aiserie logs
 * automatically (daily, weekly, monthly or yearly). Lives on the Finance
 * screen and reuses the same card language as bills and budgets.
 */
export function RecurringSection() {
  const finance = useFinance();
  const recurring = useRecurring();
  const ui = useUI();
  const { t, shadow } = useTheme();

  const [modal, setModal] = useState<{ rule?: Recurring } | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [catId, setCatId] = useState('food');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [freq, setFreq] = useState<RecurFreq>('monthly');
  const [startDate, setStartDate] = useState(todayISO());

  const openFor = (rule?: Recurring) => {
    setName(rule?.name ?? '');
    setAmount(rule ? String(rule.amount) : '');
    setType(rule?.type ?? 'expense');
    setCatId(rule?.categoryId ?? 'food');
    setAccountId(rule?.accountId);
    setFreq(rule?.freq ?? 'monthly');
    setStartDate(rule?.startDate ?? todayISO());
    setModal({ rule });
  };

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = () => {
    const amt = parseAmount(amount);
    if (!name.trim()) {
      ui.toast('Give it a short name, e.g. "Salary" or "Netflix".');
      return;
    }
    if (amt === null) {
      ui.toast('Enter an amount greater than zero.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      ui.toast('Pick a start date (YYYY-MM-DD).');
      return;
    }
    const base = {
      name: name.trim().slice(0, 40),
      type,
      amount: amt,
      categoryId: cats.some((c) => c.id === catId) ? catId : cats[0].id,
      accountId,
      freq,
      startDate,
      paused: modal?.rule?.paused ?? false,
    };
    if (modal?.rule) {
      // keep engine bookkeeping: nextRun restarts from the new start date,
      // past occurrences stay in the ledger
      recurring.updateRecurring({
        ...modal.rule,
        ...base,
        nextRun: startDate,
        lastRun: undefined,
      });
      ui.toast(`"${base.name}" updated — it logs ${FREQ_HINT[freq]} from ${fmtDate(startDate)}.`);
    } else {
      recurring.addRecurring(base);
      ui.toast(
        startDate <= todayISO()
          ? `"${base.name}" scheduled — Aiserie will log it ${FREQ_HINT[freq]}.`
          : `"${base.name}" will start on ${fmtDate(startDate)}.`
      );
    }
    setModal(null);
  };

  const togglePause = (rule: Recurring) => {
    recurring.setPaused(rule.id, !rule.paused);
    ui.toast(rule.paused ? `"${rule.name}" resumed — occurrences continue from ${fmtDate(rule.nextRun)}.` : `"${rule.name}" paused — nothing more will be logged.`);
  };

  const removeRule = (rule: Recurring) => {
    ui
      .confirm({
        title: `Delete "${rule.name}"?`,
        message: 'Future occurrences stop now. Transactions already logged stay in your history.',
        confirmLabel: 'Delete',
        danger: true,
      })
      .then((ok) => {
        if (ok) recurring.removeRecurring(rule.id);
      });
  };

  const sorted = useMemo(
    () => recurring.recurrings.slice().sort((a, b) => (a.paused === b.paused ? (a.nextRun < b.nextRun ? -1 : 1) : a.paused ? 1 : -1)),
    [recurring.recurrings]
  );

  const activeCount = recurring.recurrings.filter((r) => !r.paused).length;

  return (
    <>
      <View style={styles.sectionSpacing}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Recurring</Text>
          <Text style={[styles.sectionHint, { color: t.subtext }]}>
            {activeCount === 0 ? 'nothing scheduled yet' : `${activeCount} logging on schedule${recurring.recurrings.length !== activeCount ? ` · ${recurring.recurrings.length - activeCount} paused` : ''}`}
          </Text>
        </View>

        {recurring.recurrings.length === 0 ? (
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
            <Text style={[styles.emptyText, { color: t.subtext }]}>
              Salary every payday? Internet every month? Schedule it once and Aiserie records it automatically — no more
              forgetting, no double entries.
            </Text>
            <PressableScale onPress={() => openFor()} haptic="medium" style={[styles.primaryBtn, { backgroundColor: '#1E7A50' }]}>
              <Ionicons name="repeat" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Add a recurring</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            {sorted.map((r) => {
              const cat = getCategory(r.categoryId);
              const nexts = upcomingFor(r, 2);
              const first = nexts[0] ?? r.nextRun;
              const days = daysUntil(first);
              const when = r.paused
                ? `Paused · resumes at ${fmtDate(first)}`
                : days <= 0
                  ? `Next: today · ${fmtDate(first)}`
                  : days === 1
                    ? `Next: tomorrow · ${fmtDate(first)}`
                    : `Next: ${fmtDate(first)} · in ${days} days`;
              return (
                <View key={r.id} style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorderSoft, opacity: r.paused ? 0.62 : 1 }, shadow.card]}>
                  <View style={[styles.catBadge, { backgroundColor: (cat?.color ?? '#94A3B8') + '1E' }]}>
                    <Text style={styles.catEmoji}>{cat?.emoji ?? (r.type === 'income' ? '💰' : '🧾')}</Text>
                  </View>
                  <View style={styles.mid}>
                    <Text style={[styles.ruleName, { color: t.text }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={[styles.ruleSub, { color: r.paused ? t.faint : t.subtext }]} numberOfLines={1}>
                      {when}
                    </Text>
                    <Text style={[styles.ruleFreq, { color: t.faint }]} numberOfLines={1}>
                      {FREQS.find((f) => f.key === r.freq)?.label} · {FREQ_HINT[r.freq]}
                      {r.accountId ? ` · ${finance.accounts.find((a) => a.id === r.accountId)?.name ?? 'wallet'}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.amt, { color: r.type === 'income' ? t.income : t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {r.type === 'income' ? '+' : '−'}
                    {formatMoney(r.amount, finance.settings.currency)}
                  </Text>
                  <PressableScale onPress={() => togglePause(r)} haptic="light" scaleTo={0.85} style={styles.iconBtn}>
                    <Ionicons name={r.paused ? 'play' : 'pause'} size={15} color={t.subtext} />
                  </PressableScale>
                  <PressableScale onPress={() => openFor(r)} haptic="light" scaleTo={0.85} style={styles.iconBtn}>
                    <Ionicons name="pencil" size={15} color={t.subtext} />
                  </PressableScale>
                  <PressableScale onPress={() => removeRule(r)} haptic="light" scaleTo={0.85} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={15} color={t.faint} />
                  </PressableScale>
                </View>
              );
            })}
            <PressableScale onPress={() => openFor()} haptic="light" style={styles.ghostBtn}>
              <Ionicons name="add" size={15} color={t.ocean600} />
              <Text style={[styles.ghostBtnText, { color: t.ocean600 }]}>Add another recurring</Text>
            </PressableScale>
          </>
        )}
      </View>

      {/* add / edit modal */}
      <Modal visible={modal !== null} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: t.cardSolid }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>{modal?.rule ? 'Edit recurring' : 'New recurring'}</Text>

            <Text style={[styles.modalSection, { color: t.subtext }]}>NAME</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
              value={name}
              onChangeText={setName}
              placeholder={modal?.rule ? modal.rule.name : 'e.g. Salary, Rent, Netflix'}
              placeholderTextColor={t.faint}
              maxLength={40}
            />

            <Text style={[styles.modalSection, { color: t.subtext }]}>TYPE</Text>
            <View style={styles.chipRow}>
              {(['expense', 'income'] as const).map((tp) => (
                <TouchableOpacity
                  key={tp}
                  onPress={() => {
                    setType(tp);
                    setCatId(tp === 'income' ? INCOME_CATEGORIES[0].id : EXPENSE_CATEGORIES[0].id);
                  }}
                  style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, type === tp && { backgroundColor: tp === 'income' ? t.income : '#1E7A50', borderColor: t.ocean600 }]}
                >
                  <Text style={[styles.chipText, { color: type === tp ? '#FFFFFF' : t.text }]}>
                    {tp === 'income' ? '💰 Money in' : '🧾 Money out'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSection, { color: t.subtext }]}>AMOUNT</Text>
            <View style={[styles.amountBox, { backgroundColor: t.ice50, borderColor: t.ocean600 }]}>
              <Text style={[styles.amountCurrency, { color: t.ocean600 }]}>{finance.settings.currency === 'PHP' ? '₱' : finance.settings.currency}</Text>
              <TextInput
                style={[styles.amountInput, { color: t.text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder={modal?.rule ? String(modal.rule.amount) : '0.00'}
                placeholderTextColor={t.faint}
                keyboardType="numeric"
                autoFocus={!modal?.rule}
              />
            </View>

            <Text style={[styles.modalSection, { color: t.subtext }]}>CATEGORY</Text>
            <View style={styles.chipRow}>
              {cats.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCatId(c.id)}
                  style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, catId === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                >
                  <Text style={[styles.chipText, { color: catId === c.id ? '#FFFFFF' : t.text }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {finance.accounts.length > 0 && (
              <>
                <Text style={[styles.modalSection, { color: t.subtext }]}>WALLET (OPTIONAL)</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity onPress={() => setAccountId(undefined)} style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, !accountId && { backgroundColor: t.ice100, borderColor: t.ocean600 }]}>
                    <Text style={[styles.chipText, { color: !accountId ? t.ocean600 : t.text }]}>No wallet</Text>
                  </TouchableOpacity>
                  {finance.accounts.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => setAccountId(a.id)}
                      style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, accountId === a.id && { backgroundColor: t.ice100, borderColor: t.ocean600 }]}
                    >
                      <Text style={[styles.chipText, { color: accountId === a.id ? t.ocean600 : t.text }]}>
                        {a.emoji} {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.modalSection, { color: t.subtext }]}>REPEATS</Text>
            <View style={styles.chipRow}>
              {FREQS.map((f) => (
                <TouchableOpacity key={f.key} onPress={() => setFreq(f.key)} style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, freq === f.key && { backgroundColor: '#1E7A50', borderColor: '#1E7A50' }]}>
                  <Text style={[styles.chipText, { color: freq === f.key ? '#FFFFFF' : t.text }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSection, { color: t.subtext }]}>START DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
              value={startDate}
              onChangeText={(v) => setStartDate(v.replace(/[^0-9-]/g, '').slice(0, 10))}
              placeholder={todayISO()}
              placeholderTextColor={t.faint}
            />

            <View style={styles.modalActions}>
              <PressableScale onPress={() => setModal(null)} haptic="light" style={[styles.modalBtn, { backgroundColor: t.ice100 }]} containerStyle={styles.modalBtnContainer}>
                <Text style={[styles.modalBtnText, { color: t.text }]}>Cancel</Text>
              </PressableScale>
              <PressableScale onPress={submit} haptic="medium" style={[styles.modalBtn, { backgroundColor: '#1E7A50' }]} containerStyle={styles.modalBtnContainer}>
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{modal?.rule ? 'Save' : 'Schedule'}</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionSpacing: { marginTop: spacing.xl },
  sectionHead: { marginTop: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontFamily: font.display, fontSize: 18 },
  sectionHint: { fontFamily: font.medium, fontSize: 11.5, marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  catBadge: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  catEmoji: { fontSize: 17 },
  mid: { flex: 1, marginRight: spacing.sm },
  ruleName: { fontFamily: font.bold, fontSize: 14.5 },
  ruleSub: { fontFamily: font.bold, fontSize: 11.5, marginTop: 2 },
  ruleFreq: { fontFamily: font.medium, fontSize: 11, marginTop: 1 },
  amt: { fontFamily: font.bold, fontSize: 14, marginRight: 4, maxWidth: 110 },
  iconBtn: { padding: 6 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5 },
  chipText: { fontFamily: font.medium, fontSize: 13 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  amountCurrency: { fontFamily: font.heavy, fontSize: 22, marginRight: 10 },
  amountInput: { flex: 1, fontFamily: font.heavy, fontSize: 24, paddingVertical: 4 },
  modalInput: { borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.md, fontSize: 15, fontFamily: font.medium },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalBtnContainer: { flex: 1 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  modalBtnText: { fontFamily: font.bold, fontSize: 15 },
});
