import React, { useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import {
  ReportRange,
  buildReportCSV,
  buildReportHTML,
  rangeAllTime,
  rangeLast3Months,
  rangeLastMonth,
  rangeThisMonth,
  rangeThisYear,
  reportFileName,
} from '../services/report';
import { saveReportPDF, saveTextFile } from '../services/files';
import { formatMoney } from '../utils/money';
import { todayISO } from '../utils/stats';
import { font, radius, spacing } from '../theme';

type Preset = 'month' | 'lastMonth' | 'last3' | 'year' | 'all' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'last3', label: 'Last 3 months' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

/**
 * Export & reports — CSV for spreadsheets, PDF (branded) for people. The
 * range filter, monthly/yearly choices and both formats live in one calm
 * sheet opened from Settings.
 */
export function ReportsModal() {
  const finance = useFinance();
  const ui = useUI();
  const { t } = useTheme();
  const [preset, setPreset] = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);

  const range: ReportRange = useMemo(() => {
    switch (preset) {
      case 'month':
        return rangeThisMonth();
      case 'lastMonth':
        return rangeLastMonth();
      case 'last3':
        return rangeLast3Months();
      case 'year':
        return rangeThisYear();
      case 'all':
        return rangeAllTime();
      case 'custom': {
        const from = /^\d{4}-\d{2}-\d{2}$/.test(customFrom) ? customFrom : todayISO();
        const to = /^\d{4}-\d{2}-\d{2}$/.test(customTo) ? customTo : todayISO();
        return from <= to ? { from, to, label: 'Custom range' } : { from: to, to: from, label: 'Custom range' };
      }
    }
  }, [preset, customFrom, customTo]);

  const scoped = useMemo(() => finance.transactions.filter((tx) => tx.date >= range.from && tx.date <= range.to), [finance.transactions, range]);
  const income = scoped.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
  const expense = scoped.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0);

  const doCSV = async () => {
    if (busy) return;
    setBusy('csv');
    try {
      const csv = buildReportCSV(finance.transactions, finance.accounts, range, finance.settings.currency);
      await saveTextFile(reportFileName(range, 'csv'), 'text/csv', csv);
      ui.closeReports();
      ui.toast(`Report saved — ${scoped.length} transaction${scoped.length === 1 ? '' : 's'} in ${range.label.toLowerCase()}.`);
    } catch (e: any) {
      if (e?.message === 'popup-blocked') ui.toast('Your browser blocked the download window — allow pop-ups and try again.');
      else ui.toast('Could not save the CSV file. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const doPDF = async () => {
    if (busy) return;
    setBusy('pdf');
    try {
      const html = buildReportHTML(finance.transactions, finance.accounts, range, finance.settings.currency, finance.settings.userName);
      await saveReportPDF(html, reportFileName(range, 'pdf'));
      ui.closeReports();
      if (Platform.OS === 'web') ui.toast('Print dialog opened — choose "Save as PDF" to keep the report.');
      else ui.toast('PDF ready — choose where to save or share it.');
    } catch (e: any) {
      if (e?.message === 'popup-blocked') ui.toast('Your browser blocked the print window — allow pop-ups and try again.');
      else ui.toast('Could not build the PDF. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={ui.reportsVisible} transparent animationType="slide" onRequestClose={ui.closeReports}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.cardSolid }]}>
          <Text style={[styles.title, { color: t.text }]}>Export a report</Text>
          <Text style={[styles.sub, { color: t.subtext }]}>Pick a period — income, expenses, category breakdown, wallet balances and every transaction are included.</Text>

          <Text style={[styles.section, { color: t.subtext }]}>PERIOD</Text>
          <View style={styles.chips}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPreset(p.key)}
                style={[styles.chip, { backgroundColor: t.ice50, borderColor: t.line }, preset === p.key && { backgroundColor: '#1E7A50', borderColor: '#1E7A50' }]}
              >
                <Text style={[styles.chipText, { color: preset === p.key ? '#FFFFFF' : t.text }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {preset === 'custom' && (
            <>
              <Text style={[styles.section, { color: t.subtext }]}>FROM / TO (YYYY-MM-DD)</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }, { flex: 1 }]}
                  value={customFrom}
                  onChangeText={(v) => setCustomFrom(v.replace(/[^0-9-]/g, '').slice(0, 10))}
                  placeholder="2026-11-01"
                  placeholderTextColor={t.faint}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: t.ice50, borderColor: t.line, color: t.text }, { flex: 1 }]}
                  value={customTo}
                  onChangeText={(v) => setCustomTo(v.replace(/[^0-9-]/g, '').slice(0, 10))}
                  placeholder={todayISO()}
                  placeholderTextColor={t.faint}
                />
              </View>
            </>
          )}

          <View style={[styles.summary, { backgroundColor: t.ice50 }]}>
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: t.subtext }]}>{range.label}</Text>
              <Text style={[styles.sumVal, { color: t.text }]}>
                {scoped.length} transaction{scoped.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: t.subtext }]}>In / Out</Text>
              <Text style={[styles.sumVal, { color: t.text }]}>
                <Text style={{ color: t.income }}>{formatMoney(income, finance.settings.currency)}</Text>
                {' · '}
                {formatMoney(expense, finance.settings.currency)}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PressableScale onPress={doCSV} disabled={busy !== null} haptic="medium" style={[styles.bigBtn, { backgroundColor: t.ice100 }, busy === 'csv' && { opacity: 0.6 }]} containerStyle={styles.btnWrap}>
              <Ionicons name="grid-outline" size={18} color={t.ocean600} />
              <Text style={[styles.bigBtnText, { color: t.ocean600 }]}>{busy === 'csv' ? 'Saving…' : 'Export CSV'}</Text>
            </PressableScale>
            <PressableScale onPress={doPDF} disabled={busy !== null} haptic="medium" style={[styles.bigBtn, { backgroundColor: '#1E7A50' }, busy === 'pdf' && { opacity: 0.6 }]} containerStyle={styles.btnWrap}>
              <Ionicons name="document-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.bigBtnText, { color: '#FFFFFF' }]}>{busy === 'pdf' ? 'Building…' : 'Export PDF'}</Text>
            </PressableScale>
          </View>
          <Text style={[styles.note, { color: t.faint }]}>
            {Platform.OS === 'web'
              ? 'On web, the PDF opens in your browser’s print dialog — choose “Save as PDF”.'
              : 'Both files are created on your device and shared through the system share sheet.'}
          </Text>

          <TouchableOpacity style={styles.cancel} onPress={ui.closeReports}>
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
  section: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.2, marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5 },
  chipText: { fontFamily: font.medium, fontSize: 13 },
  dateRow: { flexDirection: 'row', gap: spacing.md },
  input: { borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.md, fontSize: 15, fontFamily: font.medium },
  summary: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  sumLabel: { fontFamily: font.medium, fontSize: 12.5 },
  sumVal: { fontFamily: font.bold, fontSize: 12.5 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  btnWrap: { flex: 1 },
  bigBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.md },
  bigBtnText: { fontFamily: font.bold, fontSize: 14.5 },
  note: { fontFamily: font.medium, fontSize: 11, lineHeight: 15, marginTop: spacing.md },
  cancel: { alignItems: 'center', paddingTop: spacing.lg },
  cancelText: { fontFamily: font.bold, fontSize: 14 },
});
