import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { spacing } from '../theme';

export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <Text style={[styles.body, { color: t.subtext }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emoji: { fontSize: 44, marginBottom: spacing.md },
  title: { fontWeight: '800', fontSize: 17, marginBottom: 6, textAlign: 'center' },
  body: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
