import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { radius, spacing } from '../theme';
import { Insight, InsightTone } from '../types';

/** One coaching card from the finance advisor engine. */
export function InsightCard({ insight }: { insight: Insight }) {
  const { t, isDark, shadow } = useTheme();
  const tone = TONE[isDark ? 'dark' : 'light'][insight.tone];
  return (
    <View style={[styles.card, { backgroundColor: tone.bg, borderLeftColor: tone.border }, shadow.card]}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>{insight.emoji}</Text>
        <Text style={[styles.title, { color: t.text }]}>{insight.title}</Text>
      </View>
      <Text style={[styles.body, { color: t.subtext }]}>{insight.body}</Text>
    </View>
  );
}

const TONE = {
  light: {
    good: { bg: '#E8F8F0', border: '#12B76A' },
    warn: { bg: '#FEF5E6', border: '#F5A524' },
    risk: { bg: '#FDECEC', border: '#EF4444' },
    info: { bg: '#E7F4FE', border: '#0EA5E9' },
  },
  dark: {
    good: { bg: 'rgba(52,211,153,0.12)', border: '#34D399' },
    warn: { bg: 'rgba(251,191,36,0.12)', border: '#FBBF24' },
    risk: { bg: 'rgba(248,113,113,0.12)', border: '#F87171' },
    info: { bg: 'rgba(56,189,248,0.12)', border: '#38BDF8' },
  },
} as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  emoji: { fontSize: 18, marginRight: 10 },
  title: { fontWeight: '800', fontSize: 15, flex: 1 },
  body: { fontSize: 13, lineHeight: 19 },
});
