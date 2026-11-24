import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import { spacing } from '../theme';

/**
 * Empty moment: the icon rests inside a woven-paper badge instead of
 * floating loose — the page still feels composed when there's nothing in it.
 */
export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: t.ice50, borderColor: t.line }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={[styles.title, { color: t.text, fontFamily: undefined }]}>{title}</Text>
      <Text style={[styles.body, { color: t.subtext }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emoji: { fontSize: 30 },
  title: { fontWeight: '800', fontSize: 17, marginBottom: 6, textAlign: 'center' },
  body: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
