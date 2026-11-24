import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getBrand } from '../data/banks';
import { accountBalance } from '../utils/accounts';
import { formatMoney } from '../utils/money';
import { radius, spacing } from '../theme';
import { PressableScale } from './PressableScale';

/** Horizontal strip of wallet balance cards shown under the Home balance card. */
export function AccountsStrip() {
  const finance = useFinance();
  const ui = useUI();
  const { t, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {finance.accounts.map((account) => {
          const balance = accountBalance(account, finance.transactions);
          const brand = getBrand(account.logoId);
          return (
            <PressableScale key={account.id} onPress={() => ui.openWallets(account.id)} style={styles.card}>
              <View style={[styles.accent, { backgroundColor: account.color }]} />
              <View style={styles.topRow}>
                {brand ? (
                  <Image source={brand.logo} style={styles.tile} resizeMode="contain" />
                ) : (
                  <Text style={styles.emoji}>{account.emoji}</Text>
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {account.name}
                </Text>
              </View>
              <Text style={[styles.balance, { color: balance >= 0 ? t.white : '#FFD9DD' }]} numberOfLines={1}>
                {formatMoney(balance, finance.settings.currency)}
              </Text>
            </PressableScale>
          );
        })}
        <PressableScale onPress={() => ui.openWallets()} style={[styles.card, styles.addCard]}>
          <Ionicons name="add" size={20} color="#E9C46A" />
          <Text style={styles.addText}>Add wallet</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, marginHorizontal: -spacing.xl },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },
  card: {
    width: 148,
    backgroundColor: 'rgba(6,20,34,0.34)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: 'hidden',
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(233,196,106,0.10)',
    borderColor: 'rgba(233,196,106,0.45)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tile: { width: 24, height: 24, borderRadius: 6 },
  emoji: { fontSize: 15 },
  name: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  balance: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 6 },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  addText: { color: '#E9C46A', fontSize: 12, fontWeight: '700' },
});
