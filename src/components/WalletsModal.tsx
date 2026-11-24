import React, { useState } from 'react';
import { Alert, Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuroraBackground } from './AuroraBackground';
import { GlassCard } from './GlassCard';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { Account, AccountType } from '../types';
import { BankDef, CASH_DEF, EWALLETS, BANKS, getBrand } from '../data/banks';
import { ACCOUNT_TYPE_LABEL, accountBalance, openingForBalance } from '../utils/accounts';
import { parseWalletMessage } from '../utils/walletDetect';
import { formatMoney, parseAmount } from '../utils/money';
import { radius, spacing } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { PressableScale } from './PressableScale';

type Step = 'list' | 'brand' | 'form';

/** Brand tile: white rounded logo, consistent on glass in both themes. */
function BrandTile({ logo, size = 56, style }: { logo: ImageSourcePropType; size?: number; style?: object }) {
  return <Image source={logo} style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]} resizeMode="contain" />;
}

export function WalletsModal() {
  const finance = useFinance();
  const ui = useUI();
  const { t, isDark, shadow } = useTheme();
  const { sheetWidth } = useResponsive();

  const [step, setStep] = useState<Step>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BankDef | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('ewallet');
  const [logoId, setLogoId] = useState<string | undefined>(undefined);
  const [balanceRaw, setBalanceRaw] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [pasteResult, setPasteResult] = useState<string>('');

  const editing = finance.accounts.find((a) => a.id === editingId) ?? null;

  const resetForm = () => {
    setEditingId(null);
    setBrand(null);
    setStep('list');
    setName('');
    setType('ewallet');
    setLogoId(undefined);
    setBalanceRaw('');
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setBrand(getBrand(account.logoId) ?? null);
    setName(account.name);
    setType(account.type);
    setLogoId(account.logoId);
    setBalanceRaw(String(accountBalance(account, finance.transactions)));
    setStep('form');
  };

  const pickBrand = (b: BankDef) => {
    setEditingId(null);
    setBrand(b);
    setName(b.name);
    setType(b.type);
    setLogoId(b.id);
    setBalanceRaw('');
    setStep('form');
  };

  const startCustom = () => {
    setEditingId(null);
    setBrand(null);
    setName('');
    setType('ewallet');
    setLogoId(undefined);
    setBalanceRaw('');
    setStep('form');
  };

  const saveAccount = () => {
    const amount = parseAmount(balanceRaw) ?? 0;
    const finalName = name.trim() || brand?.name || ACCOUNT_TYPE_LABEL[type];
    if (editing) {
      // if the user corrected the current balance, reconcile the opening value
      const current = accountBalance(editing, finance.transactions);
      const opening =
        Math.abs(current - amount) > 0.005
          ? openingForBalance(editing, finance.transactions, amount)
          : editing.openingBalance;
      finance.updateAccount({ ...editing, name: finalName, type, emoji: editing.emoji, color: brand?.color ?? editing.color, logoId, openingBalance: opening });
    } else {
      finance.addAccount({
        name: finalName,
        type,
        emoji: brand ? '🏦' : '👛',
        color: brand?.color ?? '#0A5C8C',
        logoId,
        openingBalance: amount,
      });
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

  const formTitle = editing ? `Edit ${editing.name}` : brand ? `Add ${brand.name}` : 'New wallet';

  return (
    <Modal visible={ui.walletsVisible} animationType="slide" onRequestClose={ui.closeWallets}>
      <View style={styles.screen}>
        <AuroraBackground />
        {/* header */}
        <LinearGradient
          colors={isDark ? ['#040B14', '#0A1F30', '#123049'] : ['#0C2E44', '#12486C', '#155B8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.2, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                if (step === 'form') {
                  setStep(editing ? 'list' : 'brand');
                  if (editing) setEditingId(null);
                } else if (step === 'brand') {
                  setStep('list');
                } else {
                  ui.closeWallets();
                }
              }}
              hitSlop={12}
            >
              <Ionicons name={step === 'list' ? 'chevron-back' : 'arrow-back'} size={22} color={t.white} />
            </Pressable>
            <Text style={styles.headerTitle}>
              {step === 'list' ? 'Wallets & balances' : step === 'brand' ? 'Choose a wallet' : formTitle}
            </Text>
            {step === 'list' ? (
              <Pressable onPress={startCustom} hitSlop={12}>
                <Ionicons name="add" size={26} color={t.white} />
              </Pressable>
            ) : (
              <View style={{ width: 26 }} />
            )}
          </View>
          <Text style={styles.headerSub}>
            {step === 'list'
              ? 'One tap to add GCash, Maya, your bank or cash. No logins — you set the balance.'
              : step === 'brand'
                ? 'Pick your bank or e-wallet — the logo, name and color fill in automatically.'
                : 'Enter the current balance. Transactions will keep it up to date.'}
          </Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[
            styles.body,
            sheetWidth ? { alignSelf: 'center', width: '100%', maxWidth: sheetWidth + 60 } : null,
          ]}
        >
          {/* ---------- STEP: list ---------- */}
          {step === 'list' && finance.accounts.length === 0 && (
            <GlassCard style={styles.centerCard}>
              <Text style={styles.emptyEmoji}>👛</Text>
              <Text style={[styles.emptyTitle, { color: t.text }]}>No wallets yet</Text>
              <Text style={[styles.emptyBody, { color: t.subtext }]}>
                Add GCash, Maya, Maribank, BPI, BDO, Metrobank, AUB and more with their official logos — or keep it simple
                with cash on hand.
              </Text>
              <PressableScale onPress={() => setStep('brand')} haptic="light" style={styles.ctaWrap}>
                <LinearGradient
                  colors={isDark ? ['#0A1F30', '#1B5D86', '#2B7CA8'] : ['#0C2E44', '#0F5C86', '#147BB0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  <Ionicons name="wallet-outline" size={18} color={t.white} />
                  <Text style={[styles.ctaText, { color: t.white }]}>Add your first wallet</Text>
                </LinearGradient>
              </PressableScale>
            </GlassCard>
          )}

          {step === 'list' && finance.accounts.map((account) => {
            const b = getBrand(account.logoId);
            const balance = accountBalance(account, finance.transactions);
            return (
              <PressableScale key={account.id} onPress={() => startEdit(account)} style={[styles.rowCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                <View style={styles.rowMain}>
                  {b ? (
                    <BrandTile logo={b.logo} size={46} />
                  ) : (
                    <View style={[styles.rowIcon, { backgroundColor: account.color + '22' }]}>
                      <Text style={styles.rowEmoji}>{account.emoji}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: t.text }]}>{account.name}</Text>
                    <Text style={[styles.rowSub, { color: t.subtext }]}>
                      {ACCOUNT_TYPE_LABEL[account.type]} · updated {new Date(account.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.rowBalance, { color: balance >= 0 ? t.text : t.expense }]}>
                    {formatMoney(balance, finance.settings.currency)}
                  </Text>
                </View>
              </PressableScale>
            );
          })}

          {step === 'list' && finance.accounts.length > 0 && (
            <PressableScale onPress={() => setStep('brand')} haptic="light" style={styles.ctaWrap}>
              <LinearGradient
                colors={isDark ? ['#0A1F30', '#1B5D86', '#2B7CA8'] : ['#0C2E44', '#0F5C86', '#147BB0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Ionicons name="add" size={18} color={t.white} />
                <Text style={[styles.ctaText, { color: t.white }]}>Add wallet or bank</Text>
              </LinearGradient>
            </PressableScale>
          )}

          {/* ---------- STEP: brand picker ---------- */}
          {step === 'brand' && (
            <>
              <Text style={[styles.groupLabel, { color: t.subtext }]}>E-WALLETS</Text>
              <View style={styles.brandGrid}>
                {EWALLETS.map((b) => (
                  <View key={b.id} style={styles.brandCell}>
                    <PressableScale onPress={() => pickBrand(b)} haptic="light" scaleTo={0.92} style={styles.brandCellInner}>
                      <View style={[styles.brandCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                        <BrandTile logo={b.logo} size={56} />
                        <Text style={[styles.brandName, { color: t.text }]} numberOfLines={1}>{b.name}</Text>
                      </View>
                    </PressableScale>
                  </View>
                ))}
              </View>

              <Text style={[styles.groupLabel, { color: t.subtext }]}>BANKS</Text>
              <View style={styles.brandGrid}>
                {BANKS.map((b) => (
                  <View key={b.id} style={styles.brandCell}>
                    <PressableScale onPress={() => pickBrand(b)} haptic="light" scaleTo={0.92} style={styles.brandCellInner}>
                      <View style={[styles.brandCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                        <BrandTile logo={b.logo} size={56} />
                        <Text style={[styles.brandName, { color: t.text }]} numberOfLines={1}>{b.name}</Text>
                      </View>
                    </PressableScale>
                  </View>
                ))}
              </View>

              <Text style={[styles.groupLabel, { color: t.subtext }]}>EVERYTHING ELSE</Text>
              <View style={styles.brandGrid}>
                <View style={styles.brandCell}>
                  <PressableScale onPress={() => pickBrand(CASH_DEF)} haptic="light" scaleTo={0.92} style={styles.brandCellInner}>
                    <View style={[styles.brandCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}>
                      <BrandTile logo={CASH_DEF.logo} size={56} />
                      <Text style={[styles.brandName, { color: t.text }]}>Cash</Text>
                    </View>
                  </PressableScale>
                </View>
                <View style={styles.brandCell}>
                  <PressableScale onPress={startCustom} haptic="light" scaleTo={0.92} style={styles.brandCellInner}>
                    <View style={[styles.brandCard, styles.brandCardDashed, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
                      <View style={[styles.customIcon, { backgroundColor: t.ice100 }]}>
                        <Ionicons name="create-outline" size={22} color={t.ocean600} />
                      </View>
                      <Text style={[styles.brandName, { color: t.text }]}>Custom</Text>
                    </View>
                  </PressableScale>
                </View>
              </View>
            </>
          )}

          {/* ---------- STEP: form ---------- */}
          {step === 'form' && (
            <GlassCard style={styles.formCard}>
              {brand ? (
                <View style={styles.brandPreview}>
                  <BrandTile logo={brand.logo} size={52} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[styles.brandPreviewName, { color: t.text }]}>{brand.name}</Text>
                    <Text style={[styles.brandPreviewSub, { color: t.subtext }]}>{ACCOUNT_TYPE_LABEL[brand.type]} · official logo applied</Text>
                  </View>
                  <Pressable onPress={startCustom} hitSlop={8}>
                    <Text style={[styles.changeLink, { color: t.ocean600 }]}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={[styles.label, { color: t.subtext }]}>NAME</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder={type === 'ewallet' ? 'e.g. GCash' : type === 'bank' ? 'e.g. BPI' : 'e.g. Cash on hand'}
                    placeholderTextColor={t.faint}
                  />
                </>
              )}

              {!brand && (
                <>
                  <Text style={[styles.label, { color: t.subtext }]}>TYPE</Text>
                  <View style={styles.chips}>
                    {(['ewallet', 'bank', 'cash'] as AccountType[]).map((tp) => (
                      <Pressable
                        key={tp}
                        onPress={() => setType(tp)}
                        style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, type === tp && { backgroundColor: t.ocean600, borderColor: t.ocean600 }]}
                      >
                        <Text style={[styles.chipText, { color: t.text }, type === tp && { color: t.white }]}>{ACCOUNT_TYPE_LABEL[tp]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.label, { color: t.subtext }]}>{editing ? 'SET CURRENT BALANCE' : 'CURRENT BALANCE'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
                value={balanceRaw}
                onChangeText={setBalanceRaw}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={t.faint}
              />
              <Text style={[styles.formNote, { color: t.faint }]}>
                {editing
                  ? 'Linked transactions adjust this balance automatically. Change the number above to reconcile with your real wallet.'
                  : 'Just an estimate — you can fix it any time. Linked transactions keep it updated.'}
              </Text>

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => {
                    setStep(editing ? 'list' : 'brand');
                    if (editing) setEditingId(null);
                  }}
                  style={[styles.cancelBtn, { backgroundColor: t.ice100 }]}
                >
                  <Text style={[styles.cancelText, { color: t.ocean800 }]}>Back</Text>
                </Pressable>
                <Pressable style={{ flex: 1 }} onPress={saveAccount}>
                  <LinearGradient
                    colors={isDark ? ['#0A1F30', '#1B5D86', '#2B7CA8'] : ['#0C2E44', '#0F5C86', '#147BB0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveBtn}
                  >
                    <Text style={[styles.saveText, { color: t.white }]}>{editing ? 'Save wallet' : `Add ${brand?.name ?? 'wallet'}`}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              {editing && (
                <Pressable onPress={() => confirmDelete(editing)} style={styles.deleteLink}>
                  <Text style={[styles.deleteText, { color: t.risk }]}>Remove this wallet</Text>
                </Pressable>
              )}
            </GlassCard>
          )}

          {/* paste detection stays on the list step */}
          {step === 'list' && (
            <GlassCard style={styles.pasteCard}>
              <Text style={[styles.formTitle, { color: t.text }]}>🔎 Detect a purchase from text</Text>
              <Text style={[styles.pasteHint, { color: t.subtext }]}>
                Paste a GCash / Maya / bank SMS or notification here — Aiserie reads the amount on-device and pre-fills a
                transaction for you.
              </Text>
              <TextInput
                style={[styles.input, styles.pasteInput, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }]}
                value={pasteText}
                onChangeText={setPasteText}
                multiline
                placeholder={'e.g. You paid ₱1,250.00 to PUREGOLD using GCash'}
                placeholderTextColor={t.faint}
              />
              {pasteResult ? <Text style={[styles.pasteError, { color: t.risk }]}>{pasteResult}</Text> : null}
              <Pressable onPress={detectFromText} disabled={!pasteText.trim()}>
                <LinearGradient
                  colors={isDark ? ['#0A1F30', '#1B5D86', '#2B7CA8'] : ['#0C2E44', '#0F5C86', '#147BB0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.saveBtn, !pasteText.trim() && { opacity: 0.5 }]}
                >
                  <Text style={[styles.saveText, { color: t.white }]}>Turn into transaction</Text>
                </LinearGradient>
              </Pressable>
            </GlassCard>
          )}

          <Text style={[styles.footnote, { color: t.faint }]}>
            💡 Balances are informational only. Aiserie never connects to GCash, Maya or any bank — money moves only in the
            real apps, and you record it here (or paste the notification and let Aiserie fill it in).
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 54,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 6,
    borderBottomRightRadius: radius.lg + 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 18, marginTop: spacing.sm },
  body: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md },
  centerCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 40, textAlign: 'center', marginBottom: spacing.sm },
  emptyTitle: { fontWeight: '800', fontSize: 16, textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4, paddingHorizontal: spacing.sm },
  ctaWrap: { alignSelf: 'stretch', marginTop: spacing.lg, borderRadius: radius.md },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  ctaText: { fontWeight: '800', fontSize: 15 },
  rowCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowEmoji: { fontSize: 20 },
  rowName: { fontWeight: '800', fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowBalance: { fontWeight: '900', fontSize: 16 },
  groupLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: -spacing.sm + 2,
    paddingHorizontal: 2,
  },
  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  brandCell: { width: '30.5%', flexGrow: 1 },
  brandCellInner: { alignSelf: 'stretch' },
  brandCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 8,
  },
  brandCardDashed: { borderStyle: 'dashed' },
  brandName: { fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  customIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  brandPreview: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  brandPreviewName: { fontWeight: '900', fontSize: 17 },
  brandPreviewSub: { fontSize: 12, marginTop: 2 },
  changeLink: { fontSize: 13, fontWeight: '800' },
  formCard: { padding: spacing.lg },
  formTitle: { fontWeight: '800', fontSize: 16, marginBottom: spacing.md },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  formNote: { fontSize: 11.5, lineHeight: 16, marginTop: 6 },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md },
  cancelText: { fontWeight: '800' },
  saveBtn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontWeight: '800', fontSize: 15 },
  deleteLink: { alignItems: 'center', paddingVertical: spacing.md },
  deleteText: { fontWeight: '700', fontSize: 13 },
  pasteCard: { marginTop: spacing.md },
  pasteHint: { fontSize: 12.5, lineHeight: 18, marginBottom: spacing.md },
  pasteInput: { minHeight: 76, textAlignVertical: 'top', marginBottom: spacing.md },
  pasteError: { fontSize: 12, marginBottom: spacing.md },
  footnote: { fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.sm },
});
