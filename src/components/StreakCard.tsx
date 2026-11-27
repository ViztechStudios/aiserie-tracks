import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MascotWiggle } from './MascotWiggle';
import { useTheme } from '../store/ThemeContext';
import { useFinance } from '../store/FinanceContext';
import { computeStreak } from '../utils/streak';
import { font, radius, spacing } from '../theme';

const WEEK_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Streak card for Home — Boop-style daily logging game, in the Fern & Bark
 * voice: the tabby cheers you on, paw prints fill the week, and bones
 * forgive the occasional missed day. Everything is derived from the
 * transaction dates, so there is nothing extra to erase or drift.
 */
export function StreakCard() {
  const { t, shadow } = useTheme();
  const finance = useFinance();
  // v4.2.0: the streak scan (sort + longest run) only reruns when the ledger changes
  const s = useMemo(() => computeStreak(finance.transactions), [finance.transactions]);

  const todayISO = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  const logged = new Set(finance.transactions.map((tx) => tx.date));

  const headline = s.loggedToday
    ? 'Logged today. See you tomorrow!'
    : s.current > 0
      ? 'Log something today to keep it going.'
      : 'Log a little, every day.';

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.glassBorderSoft, borderWidth: 1 }, shadow.card]}>
      <View style={styles.top}>
        <View style={[styles.avatar, { borderColor: t.aqua300 }]}>
          <MascotWiggle bob={2} tilt={2.2} duration={2400}>
            <Image source={require('../../assets/mascot-wave.png')} style={styles.avatarImg} resizeMode="contain" />
          </MascotWiggle>
        </View>
        <View style={styles.topMid}>
          <Text style={[styles.count, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {s.current} day{s.current === 1 ? '' : 's'} in a row
          </Text>
          <Text style={[styles.headline, { color: t.subtext }]} numberOfLines={2}>
            {headline}
          </Text>
        </View>
        {s.loggedToday ? (
          <View style={[styles.boleIcon, { backgroundColor: t.income + '1E' }]}>
            <Ionicons name="checkmark-circle" size={22} color={t.income} />
          </View>
        ) : (
          <View style={[styles.boleIcon, { backgroundColor: t.goldWash }]}>
            <Ionicons name="sunny-outline" size={20} color={t.warn} />
          </View>
        )}
      </View>

      {/* paw week row */}
      <View style={styles.weekRow}>
        {s.weekDates.map((iso, i) => {
          const isFuture = iso > todayISO;
          const on = logged.has(iso);
          const isToday = iso === todayISO;
          return (
            <View key={iso} style={styles.daySlot}>
              <Text style={[styles.dayInitial, { color: isToday ? t.text : t.faint }]}>{WEEK_INITIALS[i]}</Text>
              <View
                style={[
                  styles.dayBubble,
                  { backgroundColor: t.ice100, borderColor: 'transparent' },
                  isToday && { borderColor: t.ocean600, borderWidth: 1.5 },
                ]}
              >
                {on ? (
                  <Text style={styles.paw}>🐾</Text>
                ) : (
                  <Ionicons name="ellipse-outline" size={13} color={isFuture ? t.faint : t.line} />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* stats strip */}
      <View style={[styles.stats, { borderTopColor: t.line }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.text }]}>{Math.max(s.longest, s.current)}</Text>
          <Text style={[styles.statLabel, { color: t.faint }]}>longest</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.line }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.text }]}>{s.daysLogged}</Text>
          <Text style={[styles.statLabel, { color: t.faint }]}>days logged</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.line }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.text }]}>{s.bonesLeft}/{s.bonesEarned}</Text>
          <Text style={[styles.statLabel, { color: t.faint }]}>bones</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.line }]} />
        <View style={[styles.stat, { flex: 1.4 }]}>
          <Text style={[styles.statValue, { color: t.text }]} numberOfLines={1}>
            {s.nextBadge ? s.nextBadge.label : 'All badges'}
          </Text>
          <Text style={[styles.statLabel, { color: t.faint }]}>
            {s.nextBadge ? `${s.nextBadge.needed} to go` : 'trail complete'}
          </Text>
        </View>
      </View>

      <Text style={[styles.bonesHint, { color: t.faint }]} numberOfLines={2}>
        Miss a day? A rainy-day bone keeps the streak alive — one per every five logged days.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 46, height: 46, marginTop: 3 },
  topMid: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  count: { fontFamily: font.heavy, fontSize: 21 },
  headline: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  boleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  daySlot: { alignItems: 'center', gap: 5 },
  dayInitial: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 0.5 },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  paw: { fontSize: 16 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 26 },
  statValue: { fontFamily: font.bold, fontSize: 14.5 },
  statLabel: { fontFamily: font.medium, fontSize: 10.5, marginTop: 1 },
  bonesHint: { fontFamily: font.medium, fontSize: 10.5, lineHeight: 14, marginTop: spacing.md },
});
