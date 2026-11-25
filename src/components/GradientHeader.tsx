import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, gradientsDark, gradientsLight, gradientsFor, spacing } from '../theme';
import { useTheme } from '../store/ThemeContext';

interface Props {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Hides the built-in title block (for hero layouts that roll their own). */
  bare?: boolean;
  /**
   * 'hero' (default) — soft mint-to-gold dawn gradient with dark ink text.
   * 'deep' — full fern-ink gradient with white text (Tarsi-style green page top).
   */
  tone?: 'hero' | 'deep';
}

/**
 * Page header — morning in the fern house. Two moods: the soft mint "hero"
 * for inner pages, and the deep pine "green room" for the home top. A
 * whisper of woven paper and a pale sun disc keep it warm; the color does
 * the work, no ornaments.
 */
export function GradientHeader({ title, subtitle, children, bare, tone = 'hero' }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const deep = tone === 'deep';
  const colors = deep
    ? isDark
      ? gradientsFor(true).header
      : gradientsLight.header
    : isDark
      ? gradientsDark.hero
      : gradientsLight.hero;
  const titleColor = deep ? '#FFFFFF' : isDark ? '#F2F8F3' : '#16382A';
  const eyebrowColor = deep
    ? isDark
      ? '#EFD492'
      : '#F0D492'
    : isDark
      ? '#EFD492'
      : '#3E7A57';

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.lg, backgroundColor: colors[0] }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0.25, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image
        source={
          isDark
            ? require('../../assets/textures/weave-dark.png')
            : require('../../assets/textures/weave-light.png')
        }
        resizeMode="cover"
        pointerEvents="none"
        style={[styles.weaveFill, { opacity: isDark ? 0.10 : deep ? 0.10 : 0.14 }]}
      />
      {/* pale sun through the leaves */}
      <View
        pointerEvents="none"
        style={[
          styles.sun,
          {
            backgroundColor: deep
              ? 'rgba(255,255,255,0.10)'
              : isDark
                ? 'rgba(239,212,146,0.08)'
                : 'rgba(255,255,255,0.45)',
          },
        ]}
      />
      <View style={styles.content}>
        {!bare && subtitle ? (
          <Text style={[styles.subtitle, { color: eyebrowColor }]}>{subtitle.toUpperCase()}</Text>
        ) : null}
        {!bare && title ? (
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

// Re-exported so existing `import { GradientHeader, GlassCard }` call sites keep working.
export { GlassCard } from './GlassCard';

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  // Web note: react-native-web sizes an Image with only absoluteFill insets at
  // its intrinsic pixel size, so a 480px texture left a visible seam down the
  // middle of wide (tablet) screens. Explicit 100% width/height stretches the
  // weave edge-to-edge on every platform.
  weaveFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  content: {},
  sun: {
    position: 'absolute',
    top: -46,
    right: -52,
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  subtitle: {
    fontFamily: font.bold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontFamily: font.display,
    fontSize: 27,
    letterSpacing: 0.1,
  },
});
