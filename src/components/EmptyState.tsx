import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { font, radius, spacing } from '../theme';

/**
 * Empty moment: the two companions (or a quiet icon badge), a clear title and
 * one helpful line. The page still feels composed when there's nothing in it.
 */
export function EmptyState({
  icon,
  title,
  body,
  mascot = false,
}: {
  /** Ionicons name for the badge glyph (ignored when mascot is on). */
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  /** Show the dog-and-cat duo instead of the icon badge. */
  mascot?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.wrap}>
      {mascot ? (
        <View style={[styles.mascotCard, { backgroundColor: t.card, borderColor: t.line }]}>
          <Image source={require('../../assets/mascot-duo.png')} style={styles.mascot} resizeMode="contain" />
        </View>
      ) : (
        <View style={[styles.badge, { backgroundColor: t.ice50, borderColor: t.line }]}>
          <Ionicons name={icon} size={26} color={t.subtext} />
        </View>
      )}
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <Text style={[styles.body, { color: t.subtext }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  mascotCard: {
    width: 168,
    height: 128,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  mascot: { width: 148, height: 108 },
  title: { fontFamily: font.bold, fontSize: 16, marginBottom: 6, textAlign: 'center' },
  body: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
