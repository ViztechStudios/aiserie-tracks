import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getBrand } from '../data/banks';
import { accountBalance } from '../utils/accounts';
import { formatMoney } from '../utils/money';
import { font, radius, shadow, spacing } from '../theme';
import { PressableScale } from './PressableScale';
import { AnimatedNumber } from './AnimatedNumber';
import { BrandLogo } from './BrandLogo';

/** Horizontal strip of wallet balance cards shown on Home. */
export function AccountsStrip() {
  const finance = useFinance();
  const ui = useUI();
  const { t, shadow } = useTheme();

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {finance.accounts.map((account) => {
          const balance = accountBalance(account, finance.transactions);
          const brand = getBrand(account.logoId);
          return (
            <PressableScale
              key={account.id}
              onPress={() => ui.openWallets(account.id)}
              style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}
            >
              <View style={[styles.accent, { backgroundColor: account.color }]} />
              <View style={styles.topRow}>
                {brand ? (
                  <BrandLogo logo={brand.logo} size={24} />
                ) : (
                  <Text style={styles.emoji}>{account.emoji}</Text>
                )}
                <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                  {account.name}
                </Text>
              </View>
              <AnimatedNumber
                value={balance}
                flash="auto"
                restingColor={balance >= 0 ? t.text : t.expense}
                style={[styles.balance, { color: balance >= 0 ? t.text : t.expense }]}
                format={(n) => formatMoney(n, finance.settings.currency)}
              />
            </PressableScale>
          );
        })}
        <PressableScale
          onPress={() => ui.openWallets()}
          style={[styles.card, styles.addCard, { backgroundColor: t.card, borderColor: t.glassBorderSoft }, shadow.card]}
        >
          <Ionicons name="add" size={18} color={t.sun500} />
          <Text style={[styles.addText, { color: t.subtext }]}>Add wallet</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -spacing.xl },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },
  card: {
    width: 148,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: 'hidden',
  },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emoji: { fontSize: 14 },
  name: { fontFamily: font.bold, fontSize: 12, flexShrink: 1 },
  balance: { fontFamily: font.heavy, fontSize: 15, marginTop: 8, letterSpacing: 0.1 },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  addText: { fontFamily: font.bold, fontSize: 12 },
});
