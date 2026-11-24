import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { categoriesFor, getCategory } from '../data/categories';
import { Transaction, TxType } from '../types';
import { colors, gradients, radius, shadow, spacing } from '../theme';
import { formatMoney, parseAmount } from '../utils/money';
import { todayISO } from '../utils/stats';
import { useResponsive } from '../hooks/useResponsive';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// react-native-web only — Metro strips this branch from native bundles.
const webCreateElement: ((tag: string, props: Record<string, unknown>) => React.ReactElement) | null =
  Platform.OS === 'web'
    ? (require('react-native-web') as { unstable_createElement: (tag: string, props: Record<string, unknown>) => React.ReactElement }).unstable_createElement
    : null;

/** Browser-native <input type="date"> for the PWA; never rendered on native. */
function WebDateInput({ valueISO, onChangeISO, style }: { valueISO: string; onChangeISO: (v: string) => void; style: Record<string, unknown> }) {
  if (!webCreateElement) return null;
  return webCreateElement('input', {
    type: 'date',
    value: valueISO,
    onChange: (e: { target: { value: string } }) => onChangeISO(e.target.value),
    style,
    'aria-label': 'Transaction date',
  });
}

export function TransactionModal() {
  const ui = useUI();
  const finance = useFinance();
  const { sheetWidth } = useResponsive();
  const { visible, editing, preset } = ui;

  const [type, setType] = useState<TxType>('expense');
  const [amountRaw, setAmountRaw] = useState('');
  const [categoryId, setCategoryId] = useState('groceries');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [iosPicker, setIosPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setType(editing.type);
      setAmountRaw(String(editing.amount));
      setCategoryId(editing.categoryId);
      setDate(new Date(editing.date + 'T12:00:00'));
      setNote(editing.note ?? '');
      setAccountId(editing.accountId ?? null);
    } else {
      setType('expense');
      setAmountRaw(preset?.amount !== undefined ? String(preset.amount) : '');
      setCategoryId(preset?.categoryId ?? 'groceries');
      setDate(preset?.date ? new Date(preset.date + 'T12:00:00') : new Date());
      setNote(preset?.note ?? '');
      setAccountId(preset?.accountId ?? null);
    }
    setIosPicker(false);
  }, [visible, editing, preset]);

  const cats = useMemo(() => categoriesFor(type), [type]);
  const displayAmount = parseAmount(amountRaw);

  const switchType = (t: TxType) => {
    setType(t);
    const keep = getCategory(categoryId);
    if (!keep || keep.type !== t) setCategoryId(t === 'expense' ? 'groceries' : 'salary');
  };

  const onDateChange = (event: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setIosPicker(false);
    if (d) setDate(d);
  };

  const save = () => {
    const amount = parseAmount(amountRaw);
    if (amount === null) {
      Alert.alert('Missing amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (editing) {
      const updated: Transaction = {
        ...editing,
        type,
        amount,
        categoryId,
        date: toISODate(date),
        note: note.trim() || undefined,
        accountId: accountId ?? undefined,
      };
      finance.updateTransaction(updated);
    } else {
      finance.addTransaction({
        type,
        amount,
        categoryId,
        date: toISODate(date),
        note: note.trim() || undefined,
        source: preset?.source ?? 'manual',
        accountId: accountId ?? undefined,
      });
    }
    ui.close();
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert('Delete transaction', 'This cannot be undone. Delete it?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          finance.deleteTransaction(editing.id);
          ui.close();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={ui.close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={styles.pressAway} onPress={ui.close} />
        <View style={[styles.sheet, sheetWidth ? { alignSelf: 'center', width: '100%', maxWidth: sheetWidth + 20 } : null]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{editing ? 'Edit transaction' : 'New transaction'}</Text>

          {/* type toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && styles.toggleExpense]}
              onPress={() => switchType('expense')}
            >
              <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextOn]}>− Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && styles.toggleIncome]}
              onPress={() => switchType('income')}
            >
              <Text style={[styles.toggleText, type === 'income' && styles.toggleTextOn]}>+ Income</Text>
            </TouchableOpacity>
          </View>

          {/* amount */}
          <View style={[styles.amountBox, { borderColor: type === 'income' ? colors.income : colors.expense }]}>
            <Text style={[styles.currencyChip, { color: type === 'income' ? colors.income : colors.expense }]}>
              {finance.settings.currency === 'PHP' ? '₱' : finance.settings.currency}
            </Text>
            <TextInput
              style={styles.amountInput}
              value={amountRaw}
              onChangeText={setAmountRaw}
              placeholder="0.00"
              placeholderTextColor={colors.faint}
              keyboardType="numeric"
              autoFocus={!editing}
            />
            {displayAmount !== null && (
              <Text style={styles.amountHint}>{formatMoney(displayAmount, finance.settings.currency)}</Text>
            )}
          </View>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {/* categories */}
            <Text style={styles.section}>Category</Text>
            <View style={styles.chips}>
              {cats.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[
                    styles.chip,
                    categoryId === c.id && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                >
                  <Text style={[styles.chipText, categoryId === c.id && { color: colors.white }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* wallet */}
            <Text style={styles.section}>Wallet</Text>
            <View style={styles.chips}>
              <TouchableOpacity
                onPress={() => setAccountId(null)}
                style={[styles.chip, accountId === null && { backgroundColor: colors.ocean600, borderColor: colors.ocean600 }]}
              >
                <Text style={[styles.chipText, accountId === null && { color: colors.white }]}>No wallet</Text>
              </TouchableOpacity>
              {finance.accounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setAccountId(a.id)}
                  style={[styles.chip, accountId === a.id && { backgroundColor: a.color, borderColor: a.color }]}
                >
                  <Text style={[styles.chipText, accountId === a.id && { color: colors.white }]}>
                    {a.emoji} {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* date */}
            <Text style={styles.section}>Date</Text>
            {Platform.OS === 'web' ? (
              <WebDateInput
                valueISO={toISODate(date)}
                onChangeISO={(v) => {
                  const d = new Date(v + 'T12:00:00');
                  if (!Number.isNaN(d.getTime())) setDate(d);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: colors.text,
                  backgroundColor: colors.ice50,
                  border: `1.5px solid ${colors.line}`,
                  borderRadius: radius.md,
                }}
              />
            ) : (
              <TouchableOpacity style={styles.dateBtn} onPress={() => setIosPicker(true)}>
                <Text style={styles.dateText}>
                  📅 {date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            )}

            {/* note */}
            <Text style={styles.section}>Note</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Weekly grocery at Puregold"
              placeholderTextColor={colors.faint}
              multiline
            />
            <View style={{ height: 8 }} />
          </ScrollView>

          {/* actions */}
          <View style={styles.actions}>
            {editing && (
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ flex: 1 }} onPress={save}>
              <LinearGradient
                colors={gradients.fab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtn}
              >
                <Text style={styles.saveText}>{editing ? 'Save changes' : 'Add transaction'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* date picker: iOS spinner in sub-modal, Android native dialog */}
        {Platform.OS === 'ios' ? (
          <Modal visible={iosPicker} transparent animationType="fade" onRequestClose={() => setIosPicker(false)}>
            <View style={styles.pickerBackdrop}>
              <View style={styles.pickerSheet}>
                <DateTimePicker value={date} mode="date" display="spinner" onChange={onDateChange} />
                <TouchableOpacity style={styles.pickerDone} onPress={() => setIosPicker(false)}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : iosPicker ? (
          <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6, 38, 64, 0.45)', justifyContent: 'flex-end' },
  pressAway: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '92%',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.lg },
  toggle: { flexDirection: 'row', backgroundColor: colors.ice100, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md - 4, alignItems: 'center' },
  toggleExpense: { backgroundColor: colors.expense },
  toggleIncome: { backgroundColor: colors.income },
  toggleText: { color: colors.subtext, fontWeight: '700', fontSize: 14 },
  toggleTextOn: { color: colors.white },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.ice50,
  },
  currencyChip: { fontSize: 24, fontWeight: '800', marginRight: 10 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.text, paddingVertical: 4 },
  amountHint: { color: colors.faint, fontSize: 12 },
  section: { color: colors.subtext, fontSize: 12, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.ice50,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  dateBtn: {
    backgroundColor: colors.ice50,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  dateText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  noteInput: {
    backgroundColor: colors.ice50,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.md },
  deleteBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: '#FDECEC' },
  deleteText: { color: colors.risk, fontWeight: '800' },
  saveBtn: { borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', ...shadow.fab },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(6,38,64,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: colors.card, paddingBottom: spacing.lg },
  pickerDone: { alignSelf: 'center', marginTop: -spacing.sm, paddingHorizontal: 24, paddingVertical: 10 },
  pickerDoneText: { color: colors.ocean600, fontWeight: '800', fontSize: 16 },
});
