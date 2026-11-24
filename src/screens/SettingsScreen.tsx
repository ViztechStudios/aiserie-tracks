import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '../components/GradientHeader';
import { useFinance } from '../store/FinanceContext';
import { CURRENCIES } from '../data/currencies';
import { colors, radius, shadow, spacing } from '../theme';
import { formatMoney } from '../utils/money';

export function SettingsScreen() {
  const finance = useFinance();
  const [pickerOpen, setPickerOpen] = useState(false);
  const current = useMemo(
    () => CURRENCIES.find((c) => c.code === finance.settings.currency) ?? CURRENCIES[0],
    [finance.settings.currency]
  );

  const askSample = () => {
    if (finance.transactions.length > 0) {
      Alert.alert(
        'Load sample data?',
        'This replaces your current transactions with 4 months of example data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: finance.loadSampleData },
        ]
      );
    } else {
      finance.loadSampleData();
    }
  };

  const askClear = () => {
    Alert.alert('Erase everything?', 'All transactions saved on this device will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => finance.clearAllData() },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title="Settings" subtitle="Tune Aiserie to your money life" />

        <View style={styles.body}>
          <Text style={styles.section}>Currency</Text>
          <TouchableOpacity style={[styles.row, shadow.card]} onPress={() => setPickerOpen(true)}>
            <Text style={styles.rowEmoji}>{current.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{current.label}</Text>
              <Text style={styles.rowSub}>
                {formatMoney(1250, finance.settings.currency)} · used across every screen
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </TouchableOpacity>

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
          <TouchableOpacity style={[styles.row, shadow.card]} onPress={askSample}>
            <Text style={styles.rowEmoji}>🧪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Load sample data</Text>
              <Text style={styles.rowSub}>Try the app with 4 months of realistic demo transactions.</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, shadow.card]} onPress={askClear}>
            <Text style={styles.rowEmoji}>🗑️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.risk }]}>Erase all transactions</Text>
              <Text style={styles.rowSub}>Wipe every transaction from this device.</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.section}>Receipt scanning</Text>
          <View style={[styles.row, shadow.card]}>
            <Text style={styles.rowEmoji}>🧾</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>How it works</Text>
              <Text style={styles.rowSub}>
                On-device text recognition reads the receipt total — the photo never leaves your phone. In Expo Go the OCR
                engine is unavailable; install a development or production build for full scanning.
              </Text>
            </View>
          </View>

          <Text style={styles.section}>About</Text>
          <View style={[styles.row, shadow.card]}>
            <Text style={styles.rowEmoji}>🌊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Aiserie Tracks v1.0.0</Text>
              <Text style={styles.rowSub}>
                A light-blue finance companion for iOS and Android. Built with Expo, React Native and a lot of ocean
                gradients.
              </Text>
            </View>
          </View>
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
                  {c.code === finance.settings.currency && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.ocean600} />
                  )}
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
  currencyRowOn: { backgroundColor: colors.ice50, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md },
  currencyFlag: { fontSize: 24, marginRight: spacing.md },
  currencyLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  currencyCode: { color: colors.subtext, fontSize: 12, marginTop: 1 },
  pickerCancel: { alignItems: 'center', paddingVertical: spacing.lg },
  pickerCancelText: { color: colors.subtext, fontWeight: '700' },
});
