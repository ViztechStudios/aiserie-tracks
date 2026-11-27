import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, gradientsDark, gradientsLight, spacing } from '../theme';
import { useTheme } from '../store/ThemeContext';

interface Props {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Hides the built-in title block (for hero layouts that roll their own). */
  bare?: boolean;
  /**
   * 'deep' (default in call sites) — v4.3.0 showroom veil: no painted block,
   * the page opens straight onto the aurora canvas and the glass cards float
   * on it, exactly like the site mockups. 'hero' — the legacy soft mint-to-
   * gold dawn gradient, kept for surfaces that still want a painted top.
   */
  tone?: 'hero' | 'deep';
}

/**
 * Page header. The deep tone IS the mockup look now: transparent, title set
 * in the display serif, inks theme-aware (white on jungle night, pine on
 * mint paper). No weave, no sun disc — the backdrop component owns the
 * atmosphere, the header just stands on it.
 */
export function GradientHeader({ title, subtitle, children, bare, tone = 'hero' }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const deep = tone === 'deep';

  if (deep) {
    const titleColor = isDark ? '#FFFFFF' : '#12331F';
    const eyebrowColor = isDark ? '#8FD6B0' : '#3E7A57';
    return (
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.lg }]}>
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

  const colors = isDark ? gradientsDark.hero : gradientsLight.hero;
  const titleColor = isDark ? '#F2F8F3' : '#16382A';
  const eyebrowColor = isDark ? '#EFD492' : '#3E7A57';

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
        style={[styles.weaveFill, { opacity: isDark ? 0.10 : 0.14 }]}
      />
      {/* pale sun through the leaves */}
      <View
        pointerEvents="none"
        style={[
          styles.sun,
          {
            backgroundColor: isDark ? 'rgba(239,212,146,0.08)' : 'rgba(255,255,255,0.45)',
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
