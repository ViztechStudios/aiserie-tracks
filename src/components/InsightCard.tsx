import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { font, radius, spacing } from '../theme';
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
    good: { bg: '#E7F2EF', border: '#177E71' },
    warn: { bg: '#F9EFDC', border: '#C98A2C' },
    risk: { bg: '#FDECEC', border: '#EF4444' },
    info: { bg: '#EAF5EE', border: '#3E7A57' },
  },
  dark: {
    good: { bg: 'rgba(69,179,164,0.12)', border: '#45B3A4' },
    warn: { bg: 'rgba(224,164,78,0.12)', border: '#E0A44E' },
    risk: { bg: 'rgba(248,113,113,0.12)', border: '#F87171' },
    info: { bg: 'rgba(143,217,174,0.12)', border: '#8FD9AE' },
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
  title: { fontFamily: font.bold, fontSize: 14.5, flex: 1 },
  body: { fontFamily: font.medium, fontSize: 13, lineHeight: 19 },
});
