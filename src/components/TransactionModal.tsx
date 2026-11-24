import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import { useTheme } from '../store/ThemeContext';
import { categoriesFor, getCategory } from '../data/categories';
import { getBrand } from '../data/banks';
import { Transaction, TxType } from '../types';
import { font, radius, spacing } from '../theme';
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
  const { t, gradients, isDark } = useTheme();
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

  const switchType = (tx: TxType) => {
    setType(tx);
    const keep = getCategory(categoryId);
    if (!keep || keep.type !== tx) setCategoryId(tx === 'expense' ? 'groceries' : 'salary');
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
        <View
          style={[
            styles.sheet,
            { backgroundColor: isDark ? 'rgba(10,26,50,0.98)' : 'rgba(255,255,255,0.97)' },
            sheetWidth ? { alignSelf: 'center', width: '100%', maxWidth: sheetWidth + 20 } : null,
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.line }]} />
          <Text style={[styles.title, { color: t.text }]}>{editing ? 'Edit transaction' : 'New transaction'}</Text>

          {/* type toggle */}
          <View style={[styles.toggle, { backgroundColor: t.ice100 }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && { backgroundColor: t.expense }]}
              onPress={() => switchType('expense')}
            >
              <Text style={[styles.toggleText, { color: t.subtext }, type === 'expense' && { color: t.white }]}>− Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: t.income }]}
              onPress={() => switchType('income')}
            >
              <Text style={[styles.toggleText, { color: t.subtext }, type === 'income' && { color: t.white }]}>+ Income</Text>
            </TouchableOpacity>
          </View>

          {/* amount */}
          <View style={[styles.amountBox, { backgroundColor: t.ice50 }, { borderColor: type === 'income' ? t.income : t.expense }]}>
            <Text style={[styles.currencyChip, { color: type === 'income' ? t.income : t.expense }]}>
              {finance.settings.currency === 'PHP' ? '₱' : finance.settings.currency}
            </Text>
            <TextInput
              style={[styles.amountInput, { color: t.text }]}
              value={amountRaw}
              onChangeText={setAmountRaw}
              placeholder="0.00"
              placeholderTextColor={t.faint}
              keyboardType="numeric"
              autoFocus={!editing}
            />
            {displayAmount !== null && (
              <Text style={[styles.amountHint, { color: t.faint }]}>{formatMoney(displayAmount, finance.settings.currency)}</Text>
            )}
          </View>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {/* categories */}
            <Text style={[styles.section, { color: t.subtext }]}>Category</Text>
            <View style={styles.chips}>
              {cats.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[
                    styles.chip,
                    { backgroundColor: t.ice50, borderColor: t.line },
                    categoryId === c.id && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                >
                  <Text style={[styles.chipText, { color: t.text }, categoryId === c.id && { color: t.white }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* wallet */}
            <Text style={[styles.section, { color: t.subtext }]}>Wallet</Text>
            <View style={styles.chips}>
              <TouchableOpacity
                onPress={() => setAccountId(null)}
                style={[
                  styles.chip,
                  { backgroundColor: t.ice50, borderColor: t.line },
                  accountId === null && { backgroundColor: t.ocean600, borderColor: t.ocean600 },
                ]}
              >
                <Text style={[styles.chipText, { color: t.text }, accountId === null && { color: t.white }]}>No wallet</Text>
              </TouchableOpacity>
              {finance.accounts.map((a) => {
                const brand = getBrand(a.logoId);
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setAccountId(a.id)}
                    style={[
                      styles.chip,
                      { backgroundColor: t.ice50, borderColor: t.line },
                      accountId === a.id && { backgroundColor: a.color, borderColor: a.color },
                    ]}
                  >
                    <View style={styles.chipRow}>
                      {brand && <Image source={brand.logo} style={styles.chipLogo} resizeMode="contain" />}
                      {!brand && <Text style={styles.chipEmoji}>{a.emoji}</Text>}
                      <Text style={[styles.chipText, { color: t.text }, accountId === a.id && { color: t.white }]}>{a.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* date */}
            <Text style={[styles.section, { color: t.subtext }]}>Date</Text>
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
                  fontFamily: 'inherit',
                  color: t.text,
                  backgroundColor: t.ice50,
                  border: `1.5px solid ${t.line}`,
                  borderRadius: radius.md,
                }}
              />
            ) : (
              <TouchableOpacity style={[styles.dateBtn, { backgroundColor: t.ice50, borderColor: t.line }]} onPress={() => setIosPicker(true)}>
                <Text style={[styles.dateText, { color: t.text }]}>
                  📅 {date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            )}

            {/* note */}
            <Text style={[styles.section, { color: t.subtext }]}>Note</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Weekly grocery at Puregold"
              placeholderTextColor={t.faint}
              multiline
            />
            <View style={{ height: 8 }} />
          </ScrollView>

          {/* actions */}
          <View style={styles.actions}>
            {editing && (
              <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(248,113,113,0.14)' : '#FDECEC' }]} onPress={confirmDelete}>
                <Text style={[styles.deleteText, { color: t.risk }]}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ flex: 1 }} onPress={save}>
              <LinearGradient
                colors={gradients.fab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtn}
              >
                <Text style={[styles.saveText, { color: t.white }]}>{editing ? 'Save changes' : 'Add transaction'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* date picker: iOS spinner in sub-modal, Android native dialog */}
        {Platform.OS === 'ios' ? (
          <Modal visible={iosPicker} transparent animationType="fade" onRequestClose={() => setIosPicker(false)}>
            <View style={[styles.pickerBackdrop, { backgroundColor: isDark ? 'rgba(2,10,20,0.6)' : 'rgba(6,38,64,0.45)' }]}>
              <View style={[styles.pickerSheet, { backgroundColor: t.cardSolid }]}>
                <DateTimePicker value={date} mode="date" display="spinner" onChange={onDateChange} />
                <TouchableOpacity style={styles.pickerDone} onPress={() => setIosPicker(false)}>
                  <Text style={[styles.pickerDoneText, { color: t.ocean600 }]}>Done</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(4, 16, 31, 0.5)', justifyContent: 'flex-end' },
  pressAway: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '92%',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: spacing.md },
  title: { fontFamily: font.display, fontSize: 20, marginBottom: spacing.lg },
  toggle: { flexDirection: 'row', borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md - 4, alignItems: 'center' },
  toggleText: { fontFamily: font.bold, fontSize: 14 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  currencyChip: { fontFamily: font.heavy, fontSize: 24, marginRight: 10 },
  amountInput: { flex: 1, fontFamily: font.heavy, fontSize: 26, paddingVertical: 4 },
  amountHint: { fontSize: 12 },
  section: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipLogo: { width: 18, height: 18, borderRadius: 5 },
  chipEmoji: { fontSize: 13 },
  chipText: { fontFamily: font.medium, fontSize: 13 },
  dateBtn: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  dateText: { fontFamily: font.bold, fontSize: 14.5 },
  noteInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.md },
  deleteBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md },
  deleteText: { fontFamily: font.bold },
  saveBtn: { borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  saveText: { fontFamily: font.bold, fontSize: 16 },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { paddingBottom: spacing.lg },
  pickerDone: { alignSelf: 'center', marginTop: -spacing.sm, paddingHorizontal: 24, paddingVertical: 10 },
  pickerDoneText: { fontFamily: font.bold, fontSize: 16 },
});
