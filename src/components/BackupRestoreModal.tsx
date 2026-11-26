import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { PressableScale } from './PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useTasks } from '../store/TasksContext';
import { useBudgets } from '../store/BudgetsContext';
import { useBills } from '../store/BillsContext';
import { useRecurring } from '../store/RecurringContext';
import { useGoals } from '../store/GoalsContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { AlertState } from '../utils/budgetAlerts';
import {
  BackupData,
  backupFileName,
  buildBackup,
  validateBackup,
  Validation,
} from '../services/backup';
import { pickTextFile, saveTextFile } from '../services/files';
import { font, radius, spacing } from '../theme';

const APP_VERSION = Constants.expoConfig?.version ?? '';

type Phase = 'menu' | 'preview';

/**
 * Backup & restore — one JSON file with everything, created and read entirely
 * on-device. Export always confirms what it is about to write; import always
 * validates first, shows what will happen, and lets the user choose between
 * merging (never overwrites or duplicates existing records) and replacing
 * (with a second, explicit confirmation).
 */
export function BackupRestoreModal() {
  const finance = useFinance();
  const tasks = useTasks();
  const budgets = useBudgets();
  const bills = useBills();
  const recurring = useRecurring();
  const goals = useGoals();
  const ui = useUI();
  const { t } = useTheme();

  const open = ui.backupVisible !== false;
  const initialMode = ui.backupVisible === 'import' ? 'import' : 'export';

  const [phase, setPhase] = useState<Phase>('menu');
  const [validation, setValidation] = useState<Validation | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!open) {
      started.current = false;
      setPhase('menu');
      setValidation(null);
      setFileName('');
      setBusy(false);
      return;
    }
    if (started.current) return;
    started.current = true;
    if (initialMode === 'import') startImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMode]);

  const counts = {
    transactions: finance.transactions.length,
    wallets: finance.accounts.length,
    tasks: tasks.tasks.length,
    budgets: budgets.budgets.length,
    bills: bills.bills.length,
    recurring: recurring.recurrings.length,
    goals: goals.goals.length,
  };

  const startImport = () => {
    setBusy(true);
    pickTextFile(['application/json', 'text/json', 'text/plain', '.json'])
      .then(async (picked) => {
        if (!picked) {
          setBusy(false);
          ui.closeBackup();
          return;
        }
        setFileName(picked.name);
        const v = validateBackup(picked.text);
        setValidation(v);
        setPhase(v.ok ? 'preview' : 'menu');
        setBusy(false);
        if (!v.ok) ui.toast(v.error ?? 'This file cannot be restored.');
      })
      .catch(() => {
        setBusy(false);
        ui.toast('Could not read the selected file.');
      });
  };

  const doExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const backup = buildBackup(
        {
          transactions: finance.transactions,
          accounts: finance.accounts,
          settings: finance.settings,
          tasks: tasks.tasks,
          budgets: budgets.budgets,
          bills: bills.bills,
          recurring: recurring.recurrings,
          budgetAlerts: budgets.alertState as AlertState,
          goals: goals.goals,
        },
        APP_VERSION
      );
      const name = backupFileName();
      await saveTextFile(name, 'application/json', JSON.stringify(backup, null, 2));
      ui.closeBackup();
      const total = Object.values(backup.counts ?? {}).reduce((a, b) => a + b, 0);
      ui.toast(
        total > 0
          ? `Backup saved — ${total} record${total === 1 ? '' : 's'} across ${Object.entries(backup.counts ?? {}).filter(([, v]) => v > 0).length} sections. Keep the file somewhere safe.`
          : 'Backup saved. It is an empty ledger — everything is stored on-device.'
      );
    } catch (e: any) {
      ui.toast(e?.message === 'popup-blocked' ? 'Your browser blocked the download — allow pop-ups and try again.' : 'Could not save the backup file. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const askExport = () => {
    ui
      .confirm({
        title: 'Create a backup file?',
        message: `${counts.transactions} transactions · ${counts.wallets} wallets · ${counts.tasks} tasks · ${counts.budgets} budgets · ${counts.bills} bills · ${counts.recurring} recurring · ${counts.goals} goals — plus your name and currency, in one file only you can read.`,
        confirmLabel: 'Export',
      })
      .then((ok) => {
        if (ok) doExport();
      });
  };

  const applyRestore = async (mode: 'merge' | 'replace') => {
    if (!validation?.ok || !validation.data) return;
    const d: BackupData = validation.data;
    if (mode === 'replace') {
      const second = await ui.confirm({
        title: 'Replace everything on this device?',
        message: `${counts.transactions} transactions, ${counts.wallets} wallets and all other records here will be ERASED first, then restored from "${fileName}". This cannot be undone.`,
        confirmLabel: 'Replace',
        danger: true,
      });
      if (!second) return;
    }
    setBusy(true);
    try {
      if (mode === 'replace') {
        // wipe in-memory stores, then write the backup in
        await Promise.all([finance.clearAllData(), tasks.clearAll(), budgets.clearAll(), bills.clearAll(), recurring.clearAll(), goals.clearAll()]);
      }
      // merge always adds by unique id — no duplication, no overwriting
      finance.addTransactionsUnique(d.transactions);
      // wallets: replace-lists are merged by id too (kept if new)
      finance.mergeAccounts(d.accounts);
      if (d.settings) {
        finance.setCurrency(d.settings.currency);
        finance.setUserName(d.settings.userName);
      }
      if (mode === 'replace') {
        tasks.replaceAll(d.tasks);
        budgets.replaceAll(d.budgets);
        bills.replaceAll(d.bills);
        recurring.replaceAll(d.recurring);
        goals.replaceGoals(d.goals);
        budgets.setAlertState(d.budgetAlerts);
      } else {
        // merge: append records whose id is not already on the device
        const merge = <T extends { id: string }>(incoming: T[], current: T[]) => {
          const ids = new Set(current.map((x) => x.id));
          return [...incoming.filter((x) => !ids.has(x.id)), ...current];
        };
        tasks.replaceAll(merge(d.tasks, tasks.tasks));
        budgets.replaceAll(merge(d.budgets, budgets.budgets));
        bills.replaceAll(merge(d.bills, bills.bills));
        recurring.replaceAll(merge(d.recurring, recurring.recurrings));
        goals.replaceGoals(merge(d.goals, goals.goals));
        budgets.setAlertState({ ...d.budgetAlerts, ...budgets.alertState });
      }
      ui.closeBackup();
      ui.toast(`Restore complete — ${d.transactions.length} transactions and ${d.accounts.length} wallets from ${fileName}.`);
    } catch {
      ui.toast('Restore failed midway — your data is safe; try importing the file again.');
    } finally {
      setBusy(false);
    }
  };

  const askMerge = () => {
    ui
      .confirm({
        title: 'Add the backup to this device?',
        message: `New records are ADDED — ${validation?.counts ? Object.values(validation.counts).reduce((a, b) => a + b, 0) : 0} records in the file. Existing transactions are never overwritten or duplicated.`,
        confirmLabel: 'Merge',
      })
      .then((ok) => {
        if (ok) applyRestore('merge');
      });
  };

  const askReplace = () => {
    // applyRestore('replace') carries its own explicit double confirmation
    applyRestore('replace');
  };

  const c = validation?.counts;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={ui.closeBackup}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.cardSolid }]}>
          {phase === 'menu' && !validation && (
            <>
              <Text style={[styles.title, { color: t.text }]}>Backup &amp; restore</Text>
              <Text style={[styles.sub, { color: t.subtext }]}>
                Everything Aiserie stores — transactions, wallets, tasks, budgets, bills, recurring schedules and your
                preferences — travels in one file. The file never leaves your device unless you share or move it yourself.
              </Text>

              <View style={[styles.infoCard, { backgroundColor: t.ice50 }]}>
                <Text style={[styles.infoLine, { color: t.subtext }]}>
                  On this device: {counts.transactions} transactions · {counts.wallets} wallets · {counts.tasks} tasks ·{' '}
                  {counts.budgets} budgets · {counts.bills} bills · {counts.recurring} recurring · {counts.goals} goals
                </Text>
              </View>

              <PressableScale onPress={askExport} disabled={busy} haptic="medium" style={[styles.bigBtn, { backgroundColor: '#1E7A50' }, busy && { opacity: 0.6 }]} containerStyle={styles.btnWrap}>
                <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                <Text style={[styles.bigBtnText, { color: '#FFFFFF' }]}>{busy ? 'Preparing…' : 'Export backup'}</Text>
              </PressableScale>
              <PressableScale onPress={startImport} disabled={busy} haptic="medium" style={[styles.bigBtn, { backgroundColor: t.ice100 }, busy && { opacity: 0.6 }]} containerStyle={styles.btnWrap}>
                <Ionicons name="cloud-upload-outline" size={18} color={t.ocean600} />
                <Text style={[styles.bigBtnText, { color: t.ocean600 }]}>Import backup</Text>
              </PressableScale>
              <Text style={[styles.note, { color: t.faint }]}>
                Import validates the file first and never overwrites or duplicates existing records without asking.
              </Text>
            </>
          )}

          {validation && !validation.ok && (
            <>
              <Text style={[styles.title, { color: t.risk }]}>This file cannot be restored</Text>
              <View style={[styles.infoCard, { backgroundColor: 'rgba(185,74,82,0.08)' }]}>
                <Text style={[styles.infoLine, { color: t.text }]}>{validation.error}</Text>
                <Text style={[styles.infoLine, { color: t.subtext }]}>File: {fileName}</Text>
              </View>
              <Text style={[styles.note, { color: t.faint }]}>
                Backups are the JSON files Aiserie Tracks itself exports (“aiserie-backup-…json”).
              </Text>
              <PressableScale onPress={startImport} haptic="light" style={[styles.bigBtn, { backgroundColor: t.ice100 }]} containerStyle={styles.btnWrap}>
                <Ionicons name="document-outline" size={18} color={t.ocean600} />
                <Text style={[styles.bigBtnText, { color: t.ocean600 }]}>Pick another file</Text>
              </PressableScale>
            </>
          )}

          {validation?.ok && phase === 'preview' && (
            <>
              <Text style={[styles.title, { color: t.text }]}>Backup looks good</Text>
              <View style={[styles.infoCard, { backgroundColor: t.ice50 }]}>
                <Text style={[styles.infoLine, { color: t.text }]}>
                  {c?.transactions} transactions · {c?.accounts} wallets · {c?.tasks} tasks · {c?.budgets} budgets ·{' '}
                  {c?.bills} bills · {c?.recurring} recurring
                </Text>
                <Text style={[styles.infoLine, { color: t.subtext }]}>File: {fileName}</Text>
              </View>
              <Text style={[styles.sub, { color: t.subtext }]}>Choose how to apply it:</Text>

              <PressableScale onPress={askMerge} disabled={busy} haptic="medium" style={[styles.bigBtn, { backgroundColor: '#1E7A50' }, busy && { opacity: 0.6 }]} containerStyle={styles.btnWrap}>
                <Ionicons name="git-merge-outline" size={18} color="#FFFFFF" />
                <Text style={[styles.bigBtnText, { color: '#FFFFFF' }]}>Merge — keep mine, add theirs</Text>
              </PressableScale>
              <PressableScale onPress={askReplace} disabled={busy} haptic="light" style={[styles.bigBtn, { backgroundColor: t.ice100 }]} containerStyle={styles.btnWrap}>
                <Ionicons name="swap-horizontal-outline" size={18} color={t.text} />
                <Text style={[styles.bigBtnText, { color: t.text }]}>Or replace everything on this device</Text>
              </PressableScale>
              <Text style={[styles.note, { color: t.faint }]}>
                Merge never overwrites or duplicates records — it only adds what is missing. Replace asks twice before
                erasing anything.
              </Text>
            </>
          )}

          <TouchableOpacity style={styles.cancel} onPress={ui.closeBackup}>
            <Text style={[styles.cancelText, { color: t.subtext }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(4,16,10,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl + 8,
    maxHeight: '88%',
  },
  title: { fontFamily: font.display, fontSize: 20, marginBottom: 4 },
  sub: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, marginBottom: spacing.sm },
  infoCard: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md },
  infoLine: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 19 },
  btnWrap: { marginTop: spacing.md },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.md },
  bigBtnText: { fontFamily: font.bold, fontSize: 14.5 },
  note: { fontFamily: font.medium, fontSize: 11, lineHeight: 15, marginTop: spacing.md },
  cancel: { alignItems: 'center', paddingTop: spacing.lg },
  cancelText: { fontFamily: font.bold, fontSize: 14 },
});
