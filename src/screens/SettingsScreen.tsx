import React, { useEffect, useState } from 'react';
import { Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Animated, Easing } from 'react-native';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { PressableScale } from '../components/PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useTasks } from '../store/TasksContext';
import { useBudgets } from '../store/BudgetsContext';
import { useBills } from '../store/BillsContext';
import { useRecurring } from '../store/RecurringContext';
import { useGoals } from '../store/GoalsContext';
import { useLock } from '../store/LockContext';
import { measureStorage, formatBytes, compactData } from '../store/storage';
import { isPinAcceptable } from '../utils/pinlock';
import { GOALS_KEY } from '../store/GoalsContext';
import { useUI } from '../store/UIContext';
import { useTheme, ThemeMode } from '../store/ThemeContext';
import { CURRENCIES } from '../data/currencies';
import { font, radius, spacing } from '../theme';
import { formatMoney } from '../utils/money';
import { useResponsive } from '../hooks/useResponsive';
import { checkForUpdate, RELEASES_URL } from '../services/updateCheck';

const APP_VERSION = Constants.expoConfig?.version ?? '2.1.0';

const MODE_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

/** Small tinted icon badge used in place of decorative emoji in list rows. */
function RowIcon({ name, tint }: { name: keyof typeof Ionicons.glyphMap; tint: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.rowIcon, { backgroundColor: t.ice50 }]}>
      <Ionicons name={name} size={17} color={tint} />
    </View>
  );
}

/** Segmented light/dark/system control with a springy selection pill. */
function AppearanceSwitch() {
  const { mode, setMode, isDark, t } = useTheme();
  return (
    <View style={[styles.segShell, { borderColor: t.glassBorderSoft, backgroundColor: t.ice50 }]}>
      {MODE_OPTIONS.map((opt) => {
        const active = mode === opt.key;
        return <SegButton key={opt.key} opt={opt} active={active} onPick={() => setMode(opt.key)} />;
      })}
    </View>
  );
}

function SegButton({ opt, active, onPick }: { opt: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }; active: boolean; onPick: () => void }) {
  const { t } = useTheme();
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
  const tasks = useTasks();
  const budgets = useBudgets();
  const bills = useBills();
  const recurring = useRecurring();
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
  const goals = useGoals();
  const lock = useLock();

  // ---- storage meter state ----
  const [storageReport, setStorageReport] = useState<{ totalBytes: number; entries: { key: string; bytes: number }[] } | null>(null);
  const [storageVisible, setStorageVisible] = useState(false);
  const [storageBusy, setStorageBusy] = useState(false);

  const openStorage = async () => {
    setStorageVisible(true);
    setStorageReport(await measureStorage());
  };

  const reclaim = async () => {
    setStorageBusy(true);
    const before = storageReport?.totalBytes ?? 0;
    const compact = compactData({ transactions: finance.transactions, tasks: tasks.tasks, budgetAlerts: budgets.alertState });
    const changedTx = compact.transactions.length !== finance.transactions.length;
    const changedTasks = compact.tasks.length !== tasks.tasks.length;
    if (changedTx) finance.replaceTransactions(compact.transactions as never[]);
    if (changedTasks) tasks.replaceAll(compact.tasks as never[]);
    // fresh measurement after the write settles
    setTimeout(async () => {
      const after = await measureStorage();
      setStorageReport(after);
      setStorageBusy(false);
      const freed = Math.max(before - after.totalBytes, 0);
      ui.toast(freed > 0 ? `Reclaimed ${formatBytes(freed)} of storage.` : 'Storage is already tidy — nothing to reclaim.');
    }, 700);
  };

  // ---- app lock state ----
  const [lockVisible, setLockVisible] = useState(false);
  const [pinStage, setPinStage] = useState<'first' | 'confirm' | 'disable'>('first');
  const [pinDraft, setPinDraft] = useState('');
  const [pinError, setPinError] = useState('');

  const openLockSheet = () => {
    setPinDraft('');
    setPinError('');
    setPinStage(lock.config?.enabled ? 'disable' : 'first');
    setLockVisible(true);
  };

  const handlePinDigit = (d: string) => {
    const next = (pinDraft + d).slice(0, 4);
    setPinDraft(next);
    setPinError('');
    if (next.length === 4) {
      setTimeout(() => {
        if (pinStage === 'disable') {
          if (lock.disable(next)) {
            setLockVisible(false);
            ui.toast('App lock turned off.');
          } else {
            setPinDraft('');
            setPinError('Wrong pin — try again.');
          }
        } else if (!isPinAcceptable(next)) {
          setPinDraft('');
          setPinError('Too simple — avoid repeats like 1111 or runs like 1234.');
        } else if (pinStage === 'first') {
          setPinStage('confirm');
          setPinDraft('');
        } else {
          // confirm
          // the first pin is kept in the closure? we need it stored — keep in a ref
          if (next === firstPinRef.current) {
            lock.setPin(next);
            setLockVisible(false);
            ui.toast('App lock is on — Aiserie asks for the pin at launch.');
          } else {
            setPinStage('first');
            setPinDraft('');
            setPinError('Pins did not match — start again.');
          }
        }
      }, 120);
    }
  };

  const firstPinRef = React.useRef('');
  // capture the first pin when moving to confirm stage
  React.useEffect(() => {
    if (pinStage === 'first' && pinDraft.length === 4) firstPinRef.current = pinDraft;
  }, [pinDraft, pinStage]);

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  const askClear = () => {
    ui
      .confirm({
        title: 'Erase everything?',
        message:
          'All transactions, wallets, tasks, budgets, bills, recurring schedules, savings goals and streak history saved on this device will be permanently deleted. This cannot be undone.',
        confirmLabel: 'Erase',
        danger: true,
      })
      .then(async (ok) => {
        if (!ok) return;
        // every store wipes its own state AND storage; finance also clears
        // the shared keys so nothing is re-persisted afterwards
        await Promise.all([finance.clearAllData(), tasks.clearAll(), budgets.clearAll(), bills.clearAll(), recurring.clearAll(), goals.clearAll()]);
      });
  };

  const runUpdateCheck = async () => {
    if (checking) return;
    setChecking(true);
    const info = await checkForUpdate();
    setChecking(false);
    if (info) {
      ui.showUpdate(info);
    } else {
      ui.toast(`You are up to date — v${APP_VERSION} is the latest release. New versions nudge you right here.`);
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
        <GradientHeader title="Settings" subtitle="Make Aiserie Tracks yours" tone="deep" />

        <View style={styles.body}>
          <Entrance delay={0}>
            <Text style={[styles.section, { color: t.subtext }]}>Appearance</Text>
            <AppearanceSwitch />
            <Text style={[styles.hint, { color: t.faint }]}>
              {isDark ? 'Jungle night is on — deep green with warm gold accents.' : 'Fern paper is on — soft mint with pine-ink text.'}
            </Text>
          </Entrance>

          <Entrance delay={40}>
            <Text style={[styles.section, { color: t.subtext }]}>Profile</Text>
            <View style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <RowIcon name="person-outline" tint={t.ocean600} />
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
              <RowIcon name="wallet-outline" tint={t.ocean600} />
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
              <View style={[styles.rowIcon, { backgroundColor: t.ice50 }]}>
                <Text style={styles.rowFlag}>{current.flag}</Text>
              </View>
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
              <RowIcon name="download-outline" tint={t.ocean600} />
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
              <RowIcon name="logo-android" tint={t.ocean600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Get the Android app (APK)</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  Latest signed build lives on GitHub Releases — allow "install from this source" when prompted.
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={t.faint} />
            </PressableScale>
          </Entrance>

          <Entrance delay={160}>
            <Text style={[styles.section, { color: t.subtext }]}>Backup & restore</Text>
            <PressableScale onPress={() => ui.openBackup('export')} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <RowIcon name="cloud-download-outline" tint={t.ocean600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Export backup file</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  One file with everything — transactions, wallets, budgets, bills, recurring, settings. Saved on-device.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
            <PressableScale onPress={() => ui.openBackup('import')} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <RowIcon name="cloud-upload-outline" tint={t.ocean600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Import backup file</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  Move to a new device or undo an accident — the file is validated first, then merged or applied.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
            <Text style={[styles.hint, { color: t.faint }]}>
              Backups are plain JSON that never leaves your device unless you share it. Import asks before touching anything.
            </Text>
          </Entrance>

          <Entrance delay={180}>
            <Text style={[styles.section, { color: t.subtext }]}>Reports & export</Text>
            <PressableScale onPress={() => ui.openReports()} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <RowIcon name="document-outline" tint={t.ocean600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Export report (CSV / PDF)</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  Income, expenses, category breakdown and wallet balances for any month, year or custom range.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
          </Entrance>

          <Entrance delay={200}>
            <Text style={[styles.section, { color: t.subtext }]}>Privacy & storage</Text>
            <PressableScale onPress={openLockSheet} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <RowIcon name="finger-print-outline" tint={t.ocean600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>App lock (4-digit pin)</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  {lock.config?.enabled
                    ? 'On — Aiserie asks for your pin when the app starts. Tap to turn off.'
                    : 'Off — ask for a pin when the app starts. Optional, stored as a salted hash, never the pin itself.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
            <PressableScale onPress={openStorage} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <RowIcon name="server-outline" tint={t.ocean600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Storage on this device</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  See exactly what Aiserie keeps on your phone and reclaim space from stale records.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
            <View style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <RowIcon name="lock-closed-outline" tint={t.subtext} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Private by design</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  {finance.transactions.length} transaction{finance.transactions.length === 1 ? '' : 's'} stored only on this
                  device — no account, no cloud, no tracking.
                </Text>
              </View>
            </View>
            <PressableScale onPress={askClear} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="medium">
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(185,74,82,0.10)' }]}>
                <Ionicons name="trash-outline" size={17} color={t.risk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.risk }]}>Erase all data</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>
                  Wipe every transaction, wallet, goal, task, budget and bill from this device.
                </Text>
              </View>
            </PressableScale>
          </Entrance>

          <Entrance delay={200}>
            <Text style={[styles.section, { color: t.subtext }]}>Legal</Text>
            <PressableScale onPress={() => ui.openLegal('privacy')} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <RowIcon name="shield-checkmark-outline" tint={t.ocean600} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Privacy Policy</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>What the app stores (only on-device) and what it never does.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
            <PressableScale onPress={() => ui.openLegal('terms')} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]} haptic="light">
              <RowIcon name="document-text-outline" tint={t.subtext} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Terms & Conditions</Text>
                <Text style={[styles.rowSub, { color: t.subtext }]}>Personal-use licence, "not financial advice", and the honest fine print.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.faint} />
            </PressableScale>
          </Entrance>

          {Platform.OS === 'web' && (
            <Entrance delay={240}>
              <Text style={[styles.section, { color: t.subtext }]}>Install on iPhone</Text>
              <PressableScale onPress={() => setIosHelp((v) => !v)} style={[styles.row, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
                <RowIcon name="logo-apple" tint={t.text} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Install on iPhone (Home Screen)</Text>
                  <Text style={[styles.rowSub, { color: t.subtext }]}>
                    {iosHelp
                      ? '1. Open this site in Safari.  2. Tap the Share button.  3. Scroll and tap "Add to Home Screen".  4. Tap Add — Aiserie launches full-screen with its own icon and splash.'
                      : 'Add Aiserie to your Home Screen from Safari — full-screen, with icon and splash. Tap to show the steps.'}
                  </Text>
                </View>
                <Ionicons name={iosHelp ? 'chevron-up' : 'chevron-down'} size={16} color={t.faint} />
              </PressableScale>
            </Entrance>
          )}

          <Entrance delay={280}>
            <Text style={[styles.section, { color: t.subtext }]}>About</Text>
            <View style={[styles.aboutCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
              <Image source={require('../../assets/mascot-duo.png')} style={styles.aboutMascot} resizeMode="contain" />
              <Text style={[styles.aboutTitle, { color: t.text }]}>A gift, first. An app, second.</Text>
              <Text style={[styles.aboutBody, { color: t.subtext }]}>
                I built the first version of Aiserie Tracks for my girlfriend, Aiserie. She wanted one simple place to see
                where her money goes — no bank logins, no spreadsheets, nothing intimidating. So it was made the way you
                make a gift: carefully, and for one person first.
              </Text>
              <Text style={[styles.aboutBody, { color: t.subtext }]}>
                The app is cared for by Viztech Studios, the little studio behind it. We think everyday tools can feel warm —
                which is why a pup and a tabby keep your ledger company instead of dashboards and jargon.
              </Text>
              <Text style={[styles.aboutVersion, { color: t.faint }]}>
                Aiserie Tracks v{APP_VERSION} · Fern &amp; Bark
              </Text>
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

          {/* storage meter sheet */}
          <Modal visible={storageVisible} transparent animationType="fade" onRequestClose={() => setStorageVisible(false)}>
            <TouchableOpacity style={styles.sheetScrim} activeOpacity={1} onPress={() => setStorageVisible(false)}>
              <TouchableOpacity activeOpacity={1} style={[styles.sheetCard, { backgroundColor: t.cardSolid }]} onPress={() => {}}>
                <ScrollView bounces={false}>
                  <Text style={[styles.sheetTitle, { color: t.text }]}>Storage on this device</Text>
                  <Text style={[styles.sheetHint, { color: t.subtext }]}>
                    Everything below lives only on this phone. Aiserie writes changes in one coalesced burst instead of rewriting
                    everything on every tap — lighter on flash memory and battery.
                  </Text>
                  <View style={[styles.storageTotalRow, { backgroundColor: t.card, borderColor: t.line }]}>
                    <Text style={[styles.storageTotalLabel, { color: t.subtext }]}>Total used</Text>
                    <Text style={[styles.storageTotalValue, { color: t.text }]}>
                      {storageReport ? formatBytes(storageReport.totalBytes) : '…'}
                    </Text>
                  </View>
                  {storageReport?.entries.map((e) => {
                    const label = e.key.replace('aiserie.v1.', '');
                    const pct = storageReport.totalBytes ? e.bytes / storageReport.totalBytes : 0;
                    return (
                      <View key={e.key} style={styles.storageEntry}>
                        <View style={styles.storageEntryHead}>
                          <Text style={[styles.storageKey, { color: t.text }]} numberOfLines={1}>{label}</Text>
                          <Text style={[styles.storageBytes, { color: t.subtext }]}>{formatBytes(e.bytes)}</Text>
                        </View>
                        <View style={[styles.storageTrack, { backgroundColor: 'rgba(0,0,0,0.07)' }]}>
                          <View style={[styles.storageFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: t.ocean500 }]} />
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.sheetBtnRow}>
                    <PressableScale
                      onPress={() => setStorageVisible(false)}
                      containerStyle={{ flex: 1 }}
                      style={[styles.sheetBtn, { backgroundColor: t.card, borderColor: t.line }]}
                    >
                      <Text style={[styles.sheetBtnText, { color: t.subtext }]}>Close</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={reclaim}
                      disabled={storageBusy}
                      containerStyle={{ flex: 1 }}
                      style={[styles.sheetBtn, { backgroundColor: t.ocean600 }]}
                    >
                      <Text style={[styles.sheetBtnText, { color: '#FFFFFF' }]}>
                        {storageBusy ? 'Reclaiming…' : 'Reclaim space'}
                      </Text>
                    </PressableScale>
                  </View>
                  <Text style={[styles.sheetFoot, { color: t.faint }]}>
                    Reclaiming removes duplicate or broken records and finished chores older than 45 days. Your balances and history stay untouched.
                  </Text>
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* app lock sheet */}
          <Modal visible={lockVisible} transparent animationType="fade" onRequestClose={() => setLockVisible(false)}>
            <TouchableOpacity style={styles.sheetScrim} activeOpacity={1} onPress={() => setLockVisible(false)}>
              <TouchableOpacity activeOpacity={1} style={[styles.sheetCard, styles.sheetCardSmall, { backgroundColor: t.cardSolid }]} onPress={() => {}}>
                <Text style={[styles.sheetTitle, { color: t.text }]}>
                  {pinStage === 'disable' ? 'Turn off app lock' : pinStage === 'first' ? 'Choose a 4-digit pin' : 'Repeat the pin'}
                </Text>
                <Text style={[styles.sheetHint, { color: t.subtext }]}>
                  {pinStage === 'disable'
                    ? 'Enter your current pin to turn the lock off.'
                    : pinStage === 'first'
                      ? 'Avoid repeated digits (1111) and runs (1234) — this pin guards your ledger.'
                      : 'One more time to be sure.'}
                </Text>
                <View style={styles.pinDots}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.pinDot,
                        { borderColor: pinError ? t.risk : t.ocean600, backgroundColor: i < pinDraft.length ? t.ocean600 : 'transparent' },
                      ]}
                    />
                  ))}
                </View>
                {pinError ? <Text style={[styles.pinError, { color: t.risk }]}>{pinError}</Text> : null}
                <View style={styles.pinPad}>
                  {keypad.map((k, i) =>
                    k === '' ? (
                      <View key={i} style={styles.pinKey} />
                    ) : k === 'del' ? (
                      <PressableScale key={i} onPress={() => setPinDraft((p) => p.slice(0, -1))} scaleTo={0.9} style={[styles.pinKeyBtn, { backgroundColor: t.card }]}>
                        <Ionicons name="backspace-outline" size={20} color={t.subtext} />
                      </PressableScale>
                    ) : (
                      <PressableScale key={i} onPress={() => handlePinDigit(k)} scaleTo={0.9} style={[styles.pinKeyBtn, { backgroundColor: t.card }]}>
                        <Text style={[styles.pinKeyText, { color: t.text }]}>{k}</Text>
                      </PressableScale>
                    )
                  )}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  section: {
    fontFamily: font.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  segShell: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
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
    backgroundColor: '#1E7A50',
    borderWidth: 0,
  },
  segLabel: { fontFamily: font.bold, fontSize: 13.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowFlag: { fontSize: 16 },
  rowTitle: { fontFamily: font.bold, fontSize: 15 },
  rowSub: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  aboutCard: {
    borderRadius: radius.md + 4,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  aboutMascot: { width: 148, height: 111, marginBottom: spacing.md },
  aboutTitle: { fontFamily: font.display, fontSize: 17, textAlign: 'center', marginBottom: spacing.sm },
  aboutBody: {
    fontFamily: font.medium,
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  aboutVersion: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.6, marginTop: spacing.xs },
  nameInput: { fontFamily: font.bold, fontSize: 16, paddingVertical: 6, paddingHorizontal: 0 },
  hint: { fontFamily: font.medium, fontSize: 11.5, marginTop: spacing.sm, marginBottom: spacing.md },
  pickerBackdrop: { flex: 1 },
  pickerSheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '80%',
  },
  pickerTitle: { fontFamily: font.bold, fontSize: 19, marginBottom: spacing.md },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  currencyFlag: { fontSize: 24, marginRight: spacing.md },
  currencyLabel: { fontFamily: font.bold, fontSize: 15 },
  currencyCode: { fontFamily: font.medium, fontSize: 12, marginTop: 1 },
  pickerCancel: { alignItems: 'center', paddingVertical: spacing.lg },
  pickerCancelText: { fontFamily: font.bold },

  sheetScrim: { flex: 1, backgroundColor: 'rgba(9,32,24,0.45)', alignItems: 'center', justifyContent: 'flex-end' },
  sheetCard: {
    width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%',
  },
  sheetCardSmall: { maxHeight: '70%' },
  sheetTitle: { fontFamily: font.display, fontSize: 20 },
  sheetHint: { fontFamily: font.medium, fontSize: 12.5, marginTop: 4, marginBottom: spacing.md },
  storageTotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: spacing.sm,
  },
  storageTotalLabel: { fontFamily: font.medium, fontSize: 13 },
  storageTotalValue: { fontFamily: font.heavy, fontSize: 15 },
  storageEntry: { marginTop: spacing.md },
  storageEntryHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  storageKey: { fontFamily: font.bold, fontSize: 12.5, flex: 1, marginRight: 8 },
  storageBytes: { fontFamily: font.medium, fontSize: 12 },
  storageTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  storageFill: { height: '100%', borderRadius: 4 },
  sheetBtnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  sheetBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  sheetBtnText: { fontFamily: font.bold, fontSize: 14 },
  sheetFoot: { fontFamily: font.medium, fontSize: 11.5, marginTop: spacing.md, lineHeight: 16 },
  pinDots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: spacing.md },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  pinError: { fontFamily: font.medium, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
  pinPad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: spacing.lg },
  pinKey: { width: 64, height: 58 },
  pinKeyBtn: {
    width: 64, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  pinKeyText: { fontFamily: font.heavy, fontSize: 21 },
});
