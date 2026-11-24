import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { Account, AccountType } from '../types';
import { ACCOUNT_COLORS, ACCOUNT_EMOJIS, ACCOUNT_TYPE_LABEL, accountBalance, openingForBalance } from '../utils/accounts';
import { parseWalletMessage } from '../utils/walletDetect';
import { formatMoney, parseAmount } from '../utils/money';
import { colors, gradients, radius, shadow, spacing } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { todayISO } from '../utils/stats';
import { PressableScale } from './PressableScale';

const TYPE_OPTIONS: AccountType[] = ['ewallet', 'bank', 'cash'];

export function WalletsModal() {
  const finance = useFinance();
  const ui = useUI();
  const { sheetWidth } = useResponsive();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ewallet');
  const [emoji, setEmoji] = useState(ACCOUNT_EMOJIS[0]);
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [balanceRaw, setBalanceRaw] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pasteResult, setPasteResult] = useState<string>('');

  const editing = finance.accounts.find((a) => a.id === editingId) ?? null;

  const resetForm = () => {
    setEditingId(null);
    setCreating(false);
    setName('');
    setType('ewallet');
    setEmoji(ACCOUNT_EMOJIS[0]);
    setColor(ACCOUNT_COLORS[0]);
    setBalanceRaw('');
  };

  const startEdit = (account: Account) => {
    setCreating(false);
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setEmoji(account.emoji);
    setColor(account.color);
    setBalanceRaw(String(accountBalance(account, finance.transactions)));
  };

  const startCreate = () => {
    setEditingId(null);
    setCreating(true);
    setName('');
    setType('ewallet');
    setEmoji(ACCOUNT_EMOJIS[0]);
    setColor(ACCOUNT_COLORS[0]);
    setBalanceRaw('');
  };

  const saveAccount = () => {
    const amount = parseAmount(balanceRaw) ?? 0;
    const finalName = name.trim() || ACCOUNT_TYPE_LABEL[type];
    if (editing) {
      // if the user corrected the current balance, reconcile the opening value
      const current = accountBalance(editing, finance.transactions);
      const opening =
        Math.abs(current - amount) > 0.005
          ? openingForBalance(editing, finance.transactions, amount)
          : editing.openingBalance;
      finance.updateAccount({ ...editing, name: finalName, type, emoji, color, openingBalance: opening });
    } else {
      finance.addAccount({ name: finalName, type, emoji, color, openingBalance: amount });
    }
    resetForm();
  };

  const confirmDelete = (account: Account) => {
    Alert.alert(`Remove ${account.name}?`, 'Transactions stay — they just become unlinked from this wallet.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => finance.deleteAccount(account.id) },
    ]);
  };

  const detectFromText = () => {
    const parsed = parseWalletMessage(pasteText);
    if (!parsed) {
      setPasteResult('Could not find an amount in that text. Paste the full SMS or notification.');
      return;
    }
    setPasteResult('');
    // hand off to the full transaction form, prefilled
    ui.closeWallets();
    ui.openAdd({
      amount: parsed.amount,
      categoryId: parsed.direction === 'expense' ? 'groceries' : 'other-inc',
      note: parsed.source ? `${parsed.source} · detected from text` : 'Detected from pasted text',
      source: 'detect',
    });
  };

  return (
    <Modal visible={ui.walletsVisible} animationType="slide" onRequestClose={ui.closeWallets}>
      <View style={styles.screen}>
        {/* header */}
        <LinearGradient colors={gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }} style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable onPress={ui.closeWallets} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <Text style={styles.headerTitle}>Wallets & balances</Text>
            <Pressable onPress={startCreate} hitSlop={12}>
              <Ionicons name="add" size={26} color={colors.white} />
            </Pressable>
          </View>
          <Text style={styles.headerSub}>
            Read-only view of your money — no connections, no logins. You set the balance; Aiserie keeps the math.
          </Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={[styles.body, sheetWidth ? { alignSelf: 'center', width: '100%', maxWidth: sheetWidth + 60 } : null]}>
          {finance.accounts.length === 0 && !creating && !editing && (
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.emptyEmoji}>👛</Text>
              <Text style={styles.emptyTitle}>No wallets yet</Text>
              <Text style={styles.emptyBody}>
                Add GCash, Maya, a bank or even cash-on-hand. Balances are manual — update them in one tap whenever you like.
              </Text>
            </View>
          )}

          {/* account list */}
          {finance.accounts.map((account) => {
            const balance = accountBalance(account, finance.transactions);
            return (
              <PressableScale key={account.id} onPress={() => startEdit(account)} style={[styles.card, shadow.card]}>
                <View style={styles.rowMain}>
                  <View style={[styles.rowIcon, { backgroundColor: account.color + '22' }]}>
                    <Text style={styles.rowEmoji}>{account.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{account.name}</Text>
                    <Text style={styles.rowSub}>
                      {ACCOUNT_TYPE_LABEL[account.type]} · updated {new Date(account.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.rowBalance, { color: balance >= 0 ? colors.text : colors.expense }]}>
                    {formatMoney(balance, finance.settings.currency)}
                  </Text>
                </View>
              </PressableScale>
            );
          })}

          {/* create / edit form */}
          {(creating || editing) && (
            <View style={[styles.card, shadow.card, styles.formCard]}>
              <Text style={styles.formTitle}>{editing ? `Edit ${editing.name}` : 'New wallet'}</Text>

              <Text style={styles.label}>NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={type === 'ewallet' ? 'e.g. GCash' : type === 'bank' ? 'e.g. BPI' : 'e.g. Cash on hand'}
                placeholderTextColor={colors.faint}
              />

              <Text style={styles.label}>TYPE</Text>
              <View style={styles.chips}>
                {TYPE_OPTIONS.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    style={[styles.chip, type === t && { backgroundColor: colors.ocean600, borderColor: colors.ocean600 }]}
                  >
                    <Text style={[styles.chipText, type === t && { color: colors.white }]}>{ACCOUNT_TYPE_LABEL[t]}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>ICON</Text>
              <View style={styles.chips}>
                {ACCOUNT_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[styles.chip, styles.emojiChip, emoji === e && { borderColor: colors.ocean600, backgroundColor: colors.ice100 }]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>COLOR</Text>
              <View style={styles.chips}>
                {ACCOUNT_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotOn]}
                  />
                ))}
              </View>

              <Text style={styles.label}>{editing ? 'SET CURRENT BALANCE' : 'CURRENT BALANCE'}</Text>
              <TextInput
                style={styles.input}
                value={balanceRaw}
                onChangeText={setBalanceRaw}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.faint}
              />
              {editing && (
                <Text style={styles.formNote}>
                  Linked transactions adjust this balance automatically. Change the number above to reconcile with your real wallet.
                </Text>
              )}

              <View style={styles.formActions}>
                <Pressable onPress={resetForm} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={{ flex: 1 }} onPress={saveAccount}>
                  <LinearGradient colors={gradients.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtn}>
                    <Text style={styles.saveText}>{editing ? 'Save wallet' : 'Add wallet'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              {editing && (
                <Pressable onPress={() => confirmDelete(editing)} style={styles.deleteLink}>
                  <Text style={styles.deleteText}>Remove this wallet</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* paste detection */}
          <View style={[styles.card, shadow.card, styles.pasteCard]}>
            <Text style={styles.formTitle}>🔎 Detect a purchase from text</Text>
            <Text style={styles.pasteHint}>
              Paste a GCash / Maya / bank SMS or notification here — Aiserie reads the amount on-device and pre-fills a
              transaction for you. (iOS doesn't allow reading other apps' notifications, so paste takes 2 seconds.)
            </Text>
            <TextInput
              style={[styles.input, styles.pasteInput]}
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              placeholder={'e.g. You paid ₱1,250.00 to PUREGOLD using GCash'}
              placeholderTextColor={colors.faint}
            />
            {pasteResult ? <Text style={styles.pasteError}>{pasteResult}</Text> : null}
            <Pressable onPress={detectFromText} disabled={!pasteText.trim()}>
              <LinearGradient
                colors={gradients.fab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.saveBtn, !pasteText.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.saveText}>Turn into transaction</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.footnote}>
            💡 Balances here are informational only. Aiserie never connects to GCash, Maya or any bank — money moves only
            in the real apps, and you record it here (or paste the notification and let Aiserie fill it in).
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 54,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 6,
    borderBottomRightRadius: radius.lg + 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 18, marginTop: spacing.sm },
  body: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  rowMain: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowEmoji: { fontSize: 20 },
  rowName: { color: colors.text, fontWeight: '800', fontSize: 15 },
  rowSub: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  rowBalance: { fontWeight: '900', fontSize: 16 },
  emptyEmoji: { fontSize: 40, textAlign: 'center', marginBottom: spacing.sm },
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  emptyBody: { color: colors.subtext, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  formCard: { borderWidth: 1.5, borderColor: colors.ice100 },
  formTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: spacing.md },
  label: { color: colors.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: colors.ice50,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
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
  emojiChip: { paddingHorizontal: 14, paddingVertical: 6 },
  emojiText: { fontSize: 18 },
  colorDot: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 3 },
  colorDotOn: { borderWidth: 3, borderColor: colors.ocean800 },
  formNote: { color: colors.faint, fontSize: 11.5, lineHeight: 16, marginTop: 6 },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.ice100 },
  cancelText: { color: colors.ocean800, fontWeight: '800' },
  saveBtn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', ...shadow.fab },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  deleteLink: { alignItems: 'center', paddingVertical: spacing.md },
  deleteText: { color: colors.risk, fontWeight: '700', fontSize: 13 },
  pasteCard: { borderWidth: 1.5, borderColor: colors.ice100, marginTop: spacing.md },
  pasteHint: { color: colors.subtext, fontSize: 12.5, lineHeight: 18, marginBottom: spacing.md },
  pasteInput: { minHeight: 76, textAlignVertical: 'top', marginBottom: spacing.md },
  pasteError: { color: colors.risk, fontSize: 12, marginBottom: spacing.md },
  footnote: { color: colors.faint, fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.sm },
});
