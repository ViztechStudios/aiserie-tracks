import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radius, spacing } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/** Ocean-gradient page header with rounded bottom edge. */
export function GradientHeader({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={gradients.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1.2, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </LinearGradient>
  );
}

/** Glassy card that floats on top of the gradient header. */
export function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.ocean600,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg + 6,
    borderBottomRightRadius: radius.lg + 6,
  },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 2,
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
});
