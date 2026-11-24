import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emoji: { fontSize: 44, marginBottom: spacing.md },
  title: { color: colors.text, fontWeight: '800', fontSize: 17, marginBottom: 6, textAlign: 'center' },
  body: { color: colors.subtext, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
