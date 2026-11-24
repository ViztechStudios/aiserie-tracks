import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { Entrance } from '../components/Entrance';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { CURRENCIES } from '../data/currencies';
import { colors, radius, shadow, spacing } from '../theme';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';

export function SettingsScreen() {
  const finance = useFinance();
  const ui = useUI();
  const { contentWidth } = useResponsive();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(finance.settings.userName);
  const [iosHelp, setIosHelp] = useState(false);

  // keep the local draft in sync when the saved name changes elsewhere
  useEffect(() => {
    setNameDraft(finance.settings.userName);
  }, [finance.settings.userName]);

  const current = CURRENCIES.find((c) => c.code === finance.settings.currency) ?? CURRENCIES[0];

  const askSample = () => {
    if (finance.transactions.length > 0) {
      Alert.alert('Load sample data?', 'This replaces your current transactions with 4 months of example data.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: finance.loadSampleData },
      ]);
    } else {
      finance.loadSampleData();
    }
  };

  const askClear = () => {
    Alert.alert('Erase everything?', 'All transactions and wallets saved on this device will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => finance.clearAllData() },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140, ...(contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : {}) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <GradientHeader title="Settings" subtitle="Make Aiserie Tracks yours" />

        <View style={styles.body}>
          <Entrance delay={0}>
            <Text style={styles.section}>Profile</Text>
            <View style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>💙</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Your name</Text>
                <TextInput
                  style={styles.nameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onBlur={() => finance.setUserName(nameDraft)}
                  onSubmitEditing={() => finance.setUserName(nameDraft)}
                  placeholder="Aiserie"
                  placeholderTextColor={colors.faint}
                  maxLength={24}
                  returnKeyType="done"
                />
              </View>
            </View>
            <Text style={styles.hint}>Shown on your Home greeting — default is Aiserie.</Text>
          </Entrance>

          <Entrance delay={60}>
            <Text style={styles.section}>Wallets & currency</Text>
            <PressableScale onPress={() => ui.openWallets()} style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>👛</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Wallets & balances</Text>
                <Text style={styles.rowSub}>
                  {finance.accounts.length === 0
                    ? 'Add GCash, Maya, a bank or cash — balances stay manual.'
                    : `${finance.accounts.length} wallet${finance.accounts.length === 1 ? '' : 's'} · balances update from your transactions.`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </PressableScale>
            <PressableScale onPress={() => setPickerOpen(true)} style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>{current.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{current.label}</Text>
                <Text style={styles.rowSub}>{formatMoney(1250, finance.settings.currency)} · used across every screen</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </PressableScale>
          </Entrance>

          <Entrance delay={120}>
            <Text style={styles.section}>Purchase detection</Text>
            <View style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>How detection works</Text>
                <Text style={styles.rowSub}>
                  Paste any e-wallet or bank SMS / notification into Wallets → “Detect a purchase from text”. Aiserie reads
                  the amount on-device and pre-fills the transaction. iOS doesn't allow apps to read other apps'
                  notifications, so nothing is monitored automatically — your messages stay private.
                </Text>
              </View>
            </View>
          </Entrance>

          <Entrance delay={180}>
            <Text style={styles.section}>Your data</Text>
            <View style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Private by design</Text>
                <Text style={styles.rowSub}>
                  {finance.transactions.length} transaction{finance.transactions.length === 1 ? '' : 's'} stored only on this
                  device — no account, no cloud, no tracking.
                </Text>
              </View>
            </View>
            <PressableScale onPress={askSample} style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>🧪</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Load sample data</Text>
                <Text style={styles.rowSub}>Try the app with 4 months of realistic demo transactions and wallets.</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={askClear} style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>🗑️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.risk }]}>Erase all transactions</Text>
                <Text style={styles.rowSub}>Wipe every transaction and wallet from this device.</Text>
              </View>
            </PressableScale>
          </Entrance>

          <Entrance delay={240}>
            <Text style={styles.section}>Legal</Text>
            <PressableScale onPress={() => ui.openLegal('privacy')} style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Privacy Policy</Text>
                <Text style={styles.rowSub}>What the app stores (only on-device) and what it never does.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </PressableScale>
            <PressableScale onPress={() => ui.openLegal('terms')} style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Terms & Conditions</Text>
                <Text style={styles.rowSub}>Personal-use licence, “not financial advice”, and the honest fine print.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </PressableScale>
          </Entrance>

          {Platform.OS === 'web' && (
            <Entrance delay={280}>
              <Text style={styles.section}>Install & share</Text>
              <PressableScale
                onPress={() => {
                  Linking.openURL('https://github.com/ViztechStudios/aiserie-tracks/releases/latest');
                }}
                style={[styles.row, shadow.card]}
              >
                <Text style={styles.rowEmoji}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Get the Android app (APK)</Text>
                  <Text style={styles.rowSub}>
                    Faster native experience with the camera scanner. Downloads the latest signed APK — allow
                    “install from this source” when prompted.
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.faint} />
              </PressableScale>
              <PressableScale onPress={() => setIosHelp((v) => !v)} style={[styles.row, shadow.card]}>
                <Text style={styles.rowEmoji}>📲</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Install on iPhone (Home Screen)</Text>
                  <Text style={styles.rowSub}>
                    {iosHelp
                      ? '1. Open this site in Safari.  2. Tap the Share button (□↑).  3. Scroll and tap “Add to Home Screen”.  4. Tap Add — Aiserie launches full-screen with its own icon and splash.'
                      : 'Add Aiserie to your Home Screen from Safari — full-screen, with icon and splash. Tap to show the steps.'}
                  </Text>
                </View>
                <Ionicons name={iosHelp ? 'chevron-up' : 'chevron-down'} size={16} color={colors.faint} />
              </PressableScale>
            </Entrance>
          )}

          <Entrance delay={340}>
            <Text style={styles.section}>About</Text>
            <View style={[styles.row, shadow.card]}>
              <Text style={styles.rowEmoji}>🌊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Aiserie Tracks v1.2.0</Text>
                <Text style={styles.rowSub}>
                  A light-blue finance companion for Android, iPhone and the web — built with Expo and a lot of ocean
                  gradients, made with 💙 for Aiserie.
                </Text>
              </View>
            </View>
          </Entrance>
        </View>
      </ScrollView>

      {/* currency picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Choose currency</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.currencyRow, c.code === finance.settings.currency && styles.currencyRowOn]}
                  onPress={() => {
                    finance.setCurrency(c.code);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.currencyFlag}>{c.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currencyLabel}>{c.label}</Text>
                    <Text style={styles.currencyCode}>
                      {c.code} · {formatMoney(1250, c.code)}
                    </Text>
                  </View>
                  {c.code === finance.settings.currency && <Ionicons name="checkmark-circle" size={20} color={colors.ocean600} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerOpen(false)}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  section: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rowEmoji: { fontSize: 22, marginRight: spacing.md },
  rowTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  rowSub: { color: colors.subtext, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  nameInput: { color: colors.ocean600, fontWeight: '800', fontSize: 17, paddingVertical: 6, paddingHorizontal: 0 },
  hint: { color: colors.faint, fontSize: 11.5, marginTop: -spacing.md, marginBottom: spacing.md },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(6,38,64,0.5)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '80%',
  },
  pickerTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  currencyRowOn: {
    backgroundColor: colors.ice50,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  currencyFlag: { fontSize: 24, marginRight: spacing.md },
  currencyLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  currencyCode: { color: colors.subtext, fontSize: 12, marginTop: 1 },
  pickerCancel: { alignItems: 'center', paddingVertical: spacing.lg },
  pickerCancelText: { color: colors.subtext, fontWeight: '700' },
});
