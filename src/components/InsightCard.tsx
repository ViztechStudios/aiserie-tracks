import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';
import { Insight, InsightTone } from '../types';

const TONE: Record<InsightTone, { bg: string; border: string }> = {
  good: { bg: '#E8F8F0', border: colors.good },
  warn: { bg: '#FEF5E6', border: colors.warn },
  risk: { bg: '#FDECEC', border: colors.risk },
  info: { bg: '#E7F4FE', border: colors.ocean600 },
};

/** One coaching card from the finance advisor engine. */
export function InsightCard({ insight }: { insight: Insight }) {
  const tone = TONE[insight.tone];
  return (
    <View style={[styles.card, { backgroundColor: tone.bg, borderLeftColor: tone.border }, shadow.card]}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>{insight.emoji}</Text>
        <Text style={styles.title}>{insight.title}</Text>
      </View>
      <Text style={styles.body}>{insight.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  emoji: { fontSize: 18, marginRight: 10 },
  title: { color: colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
  body: { color: colors.subtext, fontSize: 13, lineHeight: 19 },
});
