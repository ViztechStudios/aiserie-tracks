import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GradientHeader } from '../components/GradientHeader';
import { AuroraBackground } from '../components/AuroraBackground';
import { Entrance } from '../components/Entrance';
import { MonthChips } from '../components/MonthChips';
import { MonthTxList } from '../components/MonthTxList';
import { PressableScale } from '../components/PressableScale';
import { BrandLogo } from '../components/BrandLogo';
import { useFinance } from '../store/FinanceContext';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { getBrand } from '../data/banks';
import { accountBalance } from '../utils/accounts';
import { currentMonthKey, monthKey, monthLabel } from '../utils/stats';
import { formatMoney } from '../utils/money';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { font, radius, spacing } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

const CARD_W = 300;

/**
 * Wallets — the Boop-style swipe deck: every wallet is a looping card, the
 * dock below jumps to any wallet in one tap, and each card carries its own
 * actions (Expense · Income · Transfer) and day-by-day history.
 */
export function WalletsScreen() {
  const finance = useFinance();
  const ui = useUI();
  const navigation = useNavigation();
  const { t, isDark, shadow } = useTheme();
  const { contentWidth } = useResponsive();
  const deckRef = useRef<ScrollViewInstance | null>(null);
  const [index, setIndex] = useState(0);
  const [ym, setYm] = useState(currentMonthKey());

  const cards = finance.accounts;
  const clamped = Math.min(index, Math.max(cards.length - 1, 0));
  const active = cards[clamped];

  const total = useMemo(
    () => finance.accounts.reduce((sum, a) => sum + accountBalance(a, finance.transactions), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finance.accounts, finance.transactions]
  );
  // v4.2.0: one memoized balance pass instead of an O(txs) scan per card per render
  const balanceById = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of finance.accounts) map.set(a.id, accountBalance(a, finance.transactions));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finance.accounts, finance.transactions]);

  const walletTxs = useMemo(
    () =>
      finance.transactions.filter(
        (tx) =>
          monthKey(tx.date) === ym &&
          (tx.accountId === active?.id ||
            (tx.type === 'transfer' && tx.toAccountId === active?.id))
      ),
    [finance.transactions, ym, active?.id]
  );

  const jumpTo = (i: number) => {
    setIndex(i);
    deckRef.current?.scrollTo({ x: i * (CARD_W + spacing.md), animated: true });
  };

  const onDeckScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / (CARD_W + spacing.md));
    if (i !== index && i >= 0 && i < cards.length) setIndex(i);
  };

  const heroInk = isDark ? '#FFFFFF' : '#12331F';
  const heroSub = isDark ? 'rgba(240,248,243,0.72)' : 'rgba(22,56,42,0.72)';

  /** Month delta for the active wallet — expenses, income and transfers
   *  touching it, the way accountBalance moves. Shown as +₱X this month. */
  const walletDelta = useMemo(() => {
    let sum = 0;
    for (const tx of walletTxs) {
      if (tx.type === 'income') sum += tx.amount;
      else if (tx.type === 'expense') sum -= tx.amount;
      else sum += tx.toAccountId === active?.id ? tx.amount : -tx.amount;
    }
    return sum;
  }, [walletTxs, active?.id]);

  const actionFor = (type: 'expense' | 'income' | 'transfer') => {
    if (!active) return;
    ui.openAdd({
      type,
      accountId: active.id,
      categoryId: type === 'expense' ? 'groceries' : type === 'income' ? 'salary' : undefined,
    });
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <GradientHeader title="Wallets" subtitle="Everything you own, in one place" tone="deep">
          {/* total */}
          <View style={styles.totalBlock}>
            <Text style={[styles.totalLabel, { color: isDark ? '#EFD492' : '#3E7A57' }]}>TOTAL ACROSS WALLETS</Text>
            <Text style={[styles.totalValue, { color: heroInk }]}>
              {formatMoney(total, finance.settings.currency)}
            </Text>
            <Text style={[styles.totalSub, { color: heroSub }]}>
              Across {cards.length} wallet{cards.length === 1 ? '' : 's'} · synced on-device
            </Text>
          </View>

          {/* month chips (for the history list below) */}
          <View style={styles.chipsWrap}>
            <MonthChips ym={ym} onChange={setYm} variant="onGreen" />
          </View>
        </GradientHeader>

        <View style={[styles.body, contentWidth ? { alignSelf: 'center', width: '100%', maxWidth: contentWidth } : null]}>
          {cards.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, { color: t.text }]}>No wallets yet</Text>
              <Text style={[styles.emptyBody, { color: t.subtext }]}>
                Add GCash, Maya, your bank or plain cash — with official logos, balances you set, and transfers between them.
              </Text>
              <PressableScale onPress={() => ui.openWallets()} haptic="medium" style={styles.emptyBtn}>
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Add your first wallet</Text>
              </PressableScale>
            </View>
          ) : (
            <>
              <Entrance delay={80}>
                {/* card deck */}
                <ScrollView
                  ref={deckRef}
                  horizontal
                  pagingEnabled={false}
                  snapToInterval={CARD_W + spacing.md}
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.deck}
                  onScroll={onDeckScroll}
                  scrollEventThrottle={16}
                >
                  {cards.map((a, i) => {
                    const brand = getBrand(a.logoId);
                    const bal = balanceById.get(a.id) ?? 0;
                    const on = i === clamped;
                    return (
                      <View
                        key={a.id}
                        style={[
                          styles.card,
                          {
                            backgroundColor: on ? a.color : t.card,
                            borderColor: on ? a.color : t.glassBorderSoft,
                            borderWidth: 1,
                          },
                          on && !isDark && shadow.cardHi,
                        ]}
                      >
                        <View style={styles.cardTop}>
                          {brand ? (
                            // v4.4.0: the normalized brand tile renders edge-to-edge
                            // — one squircle, uniform radius, true brand color
                            <BrandLogo logo={brand.logo} size={44} />
                          ) : (
                            <View style={[styles.logoTile, { backgroundColor: on ? 'rgba(255,255,255,0.18)' : t.ice100 }]}>
                              <Text style={styles.logoEmoji}>{a.emoji}</Text>
                            </View>
                          )}
                          <View style={styles.cardNameWrap}>
                            <Text style={[styles.cardName, { color: on ? heroInk : t.text }]} numberOfLines={1}>
                              {a.name}
                            </Text>
                            <Text style={[styles.cardType, { color: on ? heroSub : t.subtext }]}>
                              {brand?.name ?? (a.type === 'ewallet' ? 'E-wallet' : a.type === 'bank' ? 'Bank' : 'Cash')}
                            </Text>
                          </View>
                          <PressableScale
                            onPress={() => ui.openWallets(a.id)}
                            haptic="light"
                            scaleTo={0.9}
                            style={[styles.cardEdit, { backgroundColor: on ? 'rgba(255,255,255,0.16)' : t.ice100 }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${a.name}`}
                          >
                            <Ionicons name="pencil" size={14} color={on ? heroInk : t.ocean600} />
                          </PressableScale>
                        </View>
                        <AnimatedNumber
                          value={bal}
                          flash="auto"
                          restingColor={on ? heroInk : t.text}
                          flashUpColor="#9FE7C0"
                          flashDownColor="#FFC9CD"
                          style={[styles.cardBalance, { color: on ? heroInk : t.text }]}
                          format={(n) => formatMoney(n, finance.settings.currency)}
                        />
                        <Text style={[styles.cardFoot, { color: on ? heroSub : t.subtext }]}>
                          {bal < 0 ? 'Owed on this wallet — check recent spending' : 'Balance updates from your transactions'}
                        </Text>
                      </View>
                    );
                  })}

                  {/* add-wallet card */}
                  <PressableScale onPress={() => ui.openWallets()} haptic="light" style={styles.addCard}>
                    <View style={[styles.addCircle, { backgroundColor: t.ice100 }]}>
                      <Ionicons name="add" size={24} color={t.ocean600} />
                    </View>
                    <Text style={[styles.addText, { color: t.text }]}>Add wallet</Text>
                    <Text style={[styles.addSub, { color: t.subtext }]}>GCash · Maya · banks · cash</Text>
                  </PressableScale>
                </ScrollView>

                {/* dock — brand wallets show their normalized tile, the rest keep the glass chip */}
                <View style={styles.dock}>
                  {cards.map((a, i) => {
                    const brand = getBrand(a.logoId);
                    const on = i === clamped;
                    return (
                      <PressableScale key={a.id} onPress={() => jumpTo(i)} haptic="light" scaleTo={0.9}>
                        {brand ? (
                          <BrandLogo logo={brand.logo} size={40} />
                        ) : (
                          <View
                            style={[
                              styles.dockTile,
                              { backgroundColor: on ? a.color : t.card, borderColor: on ? a.color : t.glassBorderSoft },
                            ]}
                          >
                            <Text style={styles.dockEmoji}>{a.emoji}</Text>
                          </View>
                        )}
                      </PressableScale>
                    );
                  })}
                  <View style={styles.dockSpacer} />
                  <PressableScale onPress={() => ui.openWallets()} haptic="light" scaleTo={0.86}>
                    <View style={[styles.dockTile, { backgroundColor: t.card, borderColor: t.glassBorderSoft }]}>
                      <Ionicons name="settings-outline" size={16} color={t.subtext} />
                    </View>
                  </PressableScale>
                </View>

                {/* actions */}
                <View style={styles.actions}>
                  <PressableScale onPress={() => actionFor('expense')} haptic="medium" scaleTo={0.94} style={styles.actionBtn} containerStyle={styles.actionContainer}>
                    <View style={[styles.actionTile, { backgroundColor: t.expense + '14' }]}>
                      <Ionicons name="arrow-down" size={17} color={t.expense} />
                    </View>
                    <Text style={[styles.actionLabel, { color: t.text }]}>Expense</Text>
                  </PressableScale>
                  <PressableScale onPress={() => actionFor('income')} haptic="medium" scaleTo={0.94} style={styles.actionBtn} containerStyle={styles.actionContainer}>
                    <View style={[styles.actionTile, { backgroundColor: t.income + '14' }]}>
                      <Ionicons name="arrow-up" size={17} color={t.income} />
                    </View>
                    <Text style={[styles.actionLabel, { color: t.text }]}>Income</Text>
                  </PressableScale>
                  <PressableScale onPress={() => actionFor('transfer')} haptic="medium" scaleTo={0.94} style={styles.actionBtn} containerStyle={styles.actionContainer}>
                    <View style={[styles.actionTile, { backgroundColor: t.ocean600 + '14' }]}>
                      <Ionicons name="swap-horizontal" size={17} color={t.ocean600} />
                    </View>
                    <Text style={[styles.actionLabel, { color: t.text }]}>Transfer</Text>
                  </PressableScale>
                </View>
              </Entrance>

              {/* history for the selected wallet */}
              <Entrance delay={160}>
                <View style={styles.historyHead}>
                  <View style={styles.historyHeadText}>
                    <Text style={[styles.historyTitle, { color: t.text }]} numberOfLines={1}>
                      {active?.name} · {monthLabel(ym, true)}
                    </Text>
                    <Text style={[styles.historySub, { color: t.subtext }]}>
                      {walletTxs.length} entr{walletTxs.length === 1 ? 'y' : 'ies'} touching this wallet
                    </Text>
                  </View>
                  {walletDelta !== 0 ? (
                    <View style={[styles.deltaChip, { backgroundColor: (walletDelta > 0 ? t.income : t.expense) + '1C' }]}>
                      <Text style={[styles.deltaText, { color: walletDelta > 0 ? t.income : t.expense }]} numberOfLines={1}>
                        {walletDelta > 0 ? '+' : '−'}{formatMoney(Math.abs(walletDelta), finance.settings.currency)} this month
                      </Text>
                    </View>
                  ) : null}
                </View>
                <MonthTxList
                  ym={ym}
                  transactions={walletTxs}
                  currency={finance.settings.currency}
                  accounts={finance.accounts}
                  onPressTx={(tx) => ui.openEdit(tx)}
                  emptyIcon="wallet-outline"
                  emptyTitle={`Nothing in ${active?.name ?? 'this wallet'} this month`}
                  emptyBody="Use the actions above to log an expense, income or a transfer into this wallet."
                />
              </Entrance>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  totalBlock: { marginTop: spacing.xl },
  totalLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1.4 },
  totalValue: {
    fontFamily: font.heavy,
    fontSize: 36,
    marginTop: 6,
    letterSpacing: 0.2,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  totalSub: { fontFamily: font.medium, fontSize: 12, marginTop: 6 },
  chipsWrap: { marginTop: spacing.lg },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 132 },
  deck: { paddingHorizontal: 2, paddingVertical: spacing.sm, gap: spacing.md, paddingRight: spacing.xl },
  card: {
    width: CARD_W,
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  logoTile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 20 },
  cardNameWrap: { flex: 1, marginHorizontal: spacing.md },
  cardName: { fontFamily: font.bold, fontSize: 15.5 },
  cardType: { fontFamily: font.medium, fontSize: 11.5, marginTop: 1 },
  cardEdit: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBalance: {
    fontFamily: font.heavy,
    fontSize: 28,
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  cardFoot: { fontFamily: font.medium, fontSize: 10.5, marginTop: 6 },
  addCard: {
    width: CARD_W,
    borderRadius: radius.lg + 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 148,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: font.bold, fontSize: 15, marginTop: spacing.md },
  addSub: { fontFamily: font.medium, fontSize: 11.5, marginTop: 3 },
  dock: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  dockTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockEmoji: { fontSize: 16 },
  dockSpacer: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionContainer: { flex: 1 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionTile: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: font.bold, fontSize: 12 },
  historyHead: { marginTop: spacing.xl, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyHeadText: { flex: 1 },
  deltaChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  deltaText: { fontFamily: font.bold, fontSize: 11 },
  historyTitle: { fontFamily: font.bold, fontSize: 15.5 },
  historySub: { fontFamily: font.medium, fontSize: 11.5, marginTop: 2 },
  emptyWrap: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyTitle: { fontFamily: font.display, fontSize: 20 },
  emptyBody: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E7A50',
    paddingHorizontal: spacing.lg + 4,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  emptyBtnText: { fontFamily: font.bold, fontSize: 14, color: '#FFFFFF' },
});
