import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing } from 'react-native';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme, ThemeMode } from '../store/ThemeContext';
import { CURRENCIES } from '../data/currencies';
import { radius, spacing } from '../theme';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';
import { checkForUpdate, RELEASES_URL } from '../services/updateCheck';

const APP_VERSION = '2.0.0';

const MODE_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

/** Segmented light/dark/system control with a springy selection pill. */
function AppearanceSwitch() {
  const { mode, setMode, isDark, t } = useTheme();
  return (
    <View style={[styles.segShell, { borderColor: t.glassBorderSoft, backgroundColor: isDark ? 'rgba(125,211,252,0.08)' : 'rgba(125,211,252,0.14)' }]}>
      {MODE_OPTIONS.map((opt) => {
        const active = mode === opt.key;
        return <SegButton key={opt.key} opt={opt} active={active} onPick={() => setMode(opt.key)} />;
      })}
    </View>
  );
}

function SegButton({ opt, active, onPick }: { opt: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }; active: boolean; onPick: () => void }) {
  const { t, isDark } = useTheme();
  const fill = React.useRef(new Animated.Value(active ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(fill, { toValue: active ? 1 : 0, speed: 30, bounciness: 6, useNativeDriver: true }).start();
  }, [active, fill]);

  return (
    <View style={styles.segSlot}>
      <PressableScale onPress={onPick} haptic="light" scaleTo={0.95} style={styles.segBtn}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segPill,
            { opacity: fill, transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
          ]}
        />
        <Ionicons name={opt.icon} size={16} color={active ? '#FFFFFF' : t.subtext} />
        <Text style={[styles.segLabel, { color: active ? '#FFFFFF' : t.subtext }]}>{opt.label}</Text>
      </PressableScale>
    </View>
  );
}

export function SettingsScreen() {
  const finance = useFinance();
  const ui = useUI();
  const { t, isDark } = useTheme();
  const { contentWidth } = useResponsive();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(finance.settings.userName);
  const [iosHelp, setIosHelp] = useState(false);
  const [checking, setChecking] = useState(false);

  // keep the local draft in sync when the saved name changes elsewhere
  useEffect(() => {
    setNameDraft(finance.settings.userName);
  }, [finance.settings.userName]);

  const current = CURRENCIES.find((c) => c.code === finance.settings.currency) ?? CURRENCIES[0];

  const askClear = () => {
    Alert.alert('Erase everything?', 'All transactions, wallets and tasks saved on this device will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => finance.clearAllData() },
    ]);
  };

  const runUpdateCheck = async () => {
    if (checking) return;
    setChecking(true);
    const info = await checkForUpdate();
    setChecking(false);
    if (info) {
      ui.showUpdate(info);
    } else {
      Alert.alert("You're up to date", `Aiserie Tracks v${APP_VERSION} is the latest release. New versions will nudge you right here.`);
    }
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 150, ...(contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : {}) }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <GradientHeader title="Settings" subtitle="Make Aiserie Tracks yours" />

        <View style={styles.body}>
          <Entrance delay={0}>
            <Text style={[styles.section, { color: t.subtext }]}>Appearance</Text>
            <AppearanceSwitch />
            <Text style={[styles.hint, { color: t.faint }]}>
              {isDark ? 'Midnight Ocean is on — deep navy glass, glowing sky accents.' : 'Daylight Ocean is on — bright, airy glass.'}
            </Text>
          </Entrance>

          <Entrance delay={40}>
            <Text style={[styles.section, { color: t.subtext }]}>Profile</Text>
            <View style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <Text style={styles.rowEmoji}>💙</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Your name</Text>
                <TextInput
                  style={[styles.nameInput, { color: t.ocean600 }]}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onBlur={() => finance.setUserName(nameDraft)}
                  onSubmitEditing={() => finance.setUserName(nameDraft)}
                  placeholder="Aiserie"
                  placeholderTextColor={t.faint}
                  maxLength={24}
                  returnKeyType="done"
                />
              </View>
            </View>
            <Text style={[styles.hint, { color: t.faint }]}>Shown on your Home greeting — default is Aiserie.</Text>
          </Entrance>

          <Entrance delay={80}>
            <Text style={[styles.section, { color: t.subtext }]}>Wallets & currency</Text>
            <PressableScale onPress={() => ui.openWallets()} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <Text style={styles.rowEmoji}>👛</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Wallets & balances</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  {finance.accounts.length === 0
                    ? 'Add GCash, Maya, a bank or cash — with official logos, in one tap.'
                    : `${finance.accounts.length} wallet${finance.accounts.length === 1 ? '' : 's'} · balances update from your transactions.`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
            <PressableScale onPress={() => setPickerOpen(true)} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <Text style={styles.rowEmoji}>{current.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>{current.label}</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>{formatMoney(1250, finance.settings.currency)} · used across every screen</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
          </Entrance>

          <Entrance delay={120}>
            <Text style={[styles.section, { color: t.subtext }]}>Updates</Text>
            <PressableScale onPress={runUpdateCheck} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <Text style={styles.rowEmoji}>{checking ? '⏳' : '🚀'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>{checking ? 'Checking…' : 'Check for updates'}</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  v{APP_VERSION} · new versions are announced here with a one-tap link to the GitHub installer.
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={t.faint} />
            </PressableScale>
            <PressableScale
              onPress={() => {
                Linking.openURL(RELEASES_URL).catch(() => {});
              }}
              style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}
              haptic="light"
            >
              <Text style={styles.rowEmoji}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Get the Android app (APK)</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  Latest signed build lives on GitHub Releases — allow “install from this source” when prompted.
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={t.faint} />
            </PressableScale>
          </Entrance>

          <Entrance delay={160}>
            <Text style={[styles.section, { color: t.subtext }]}>Your data</Text>
            <View style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <Text style={styles.rowEmoji}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Private by design</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  {finance.transactions.length} transaction{finance.transactions.length === 1 ? '' : 's'} stored only on this
                  device — no account, no cloud, no tracking.
                </Text>
              </View>
            </View>
            <PressableScale onPress={askClear} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="medium">
              <Text style={styles.rowEmoji}>🗑️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.risk }]}>Erase all data</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>Wipe every transaction, wallet and task from this device.</Text>
              </View>
            </PressableScale>
          </Entrance>

          <Entrance delay={200}>
            <Text style={[styles.section, { color: t.subtext }]}>Legal</Text>
            <PressableScale onPress={() => ui.openLegal('privacy')} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <Text style={styles.rowEmoji}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Privacy Policy</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>What the app stores (only on-device) and what it never does.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
            <PressableScale onPress={() => ui.openLegal('terms')} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <Text style={styles.rowEmoji}>📄</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Terms & Conditions</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>Personal-use licence, “not financial advice”, and the honest fine print.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
          </Entrance>

          {Platform.OS === 'web' && (
            <Entrance delay={240}>
              <Text style={[styles.section, { color: t.subtext }]}>Install on iPhone</Text>
              <PressableScale onPress={() => setIosHelp((v) => !v)} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
                <Text style={styles.rowEmoji}>📲</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Install on iPhone (Home Screen)</Text>
                  <Text style={[styles.rowSub, { color: t.subtext }]}>
                    {iosHelp
                      ? '1. Open this site in Safari.  2. Tap the Share button (□↑).  3. Scroll and tap “Add to Home Screen”.  4. Tap Add — Aiserie launches full-screen with its own icon and splash.'
                      : 'Add Aiserie to your Home Screen from Safari — full-screen, with icon and splash. Tap to show the steps.'}
                  </Text>
                </View>
                <Ionicons name={iosHelp ? 'chevron-up' : 'chevron-down'} size={16} color={t.faint} />
              </PressableScale>
            </Entrance>
          )}

          <Entrance delay={280}>
            <Text style={[styles.section, { color: t.subtext }]}>About</Text>
            <View style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <Text style={styles.rowEmoji}>🌊</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Aiserie Tracks v{APP_VERSION}</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  Ocean Glass, now in Midnight: dark mode with animated switching, official bank logos, things-to-do, an
                  animated boot screen and update nudges from GitHub. Made with 💙 by Viztech Studios for Aiserie.
                </Text>
              </View>
            </View>
          </Entrance>
        </View>
      </ScrollView>

      {/* currency picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={[styles.pickerBackdrop, { backgroundColor: isDark ? 'rgba(2,10,20,0.6)' : 'rgba(6,38,64,0.45)' }]}>
          <View style={[styles.pickerSheet, { backgroundColor: t.cardSolid }]}>
            <Text style={[styles.pickerTitle, { color: t.text }]}>Choose currency</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.currencyRow, { borderBottomColor: t.line }, c.code === finance.settings.currency && { backgroundColor: t.ice50 }]}
                  onPress={() => {
                    finance.setCurrency(c.code);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.currencyFlag}>{c.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.currencyLabel, { color: t.text }]}>{c.label}</Text>
                    <Text style={[styles.currencyCode, { color: t.subtext }]}>
                      {c.code} · {formatMoney(1250, c.code)}
                    </Text>
                  </View>
                  {c.code === finance.settings.currency && <Ionicons name="checkmark-circle" size={20} color={t.ocean600} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerOpen(false)}>
              <Text style={[styles.pickerCancelText, { color: t.subtext }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  section: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  segShell: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    backgroundColor: 'rgba(125,211,252,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.18)',
  },
  segSlot: { flex: 1 },
  segBtn: {
    flex: 1,
    borderRadius: radius.md - 4,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segPill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md - 4,
    backgroundColor: '#0EA5E9',
    borderWidth: 0,
  },
  segLabel: { fontWeight: '800', fontSize: 13.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  rowEmoji: { fontSize: 22, marginRight: spacing.md },
  rowTitle: { fontWeight: '800', fontSize: 15 },
  rowSub: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  nameInput: { fontWeight: '800', fontSize: 17, paddingVertical: 6, paddingHorizontal: 0 },
  hint: { fontSize: 11.5, marginTop: -spacing.md, marginBottom: spacing.md },
  pickerBackdrop: { flex: 1 },
  pickerSheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '80%',
  },
  pickerTitle: { fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  currencyFlag: { fontSize: 24, marginRight: spacing.md },
  currencyLabel: { fontWeight: '700', fontSize: 15 },
  currencyCode: { fontSize: 12, marginTop: 1 },
  pickerCancel: { alignItems: 'center', paddingVertical: spacing.lg },
  pickerCancelText: { fontWeight: '700' },
});
