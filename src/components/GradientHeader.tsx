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
}

/**
 * Page header — dawn over the bay. A soft sky-to-gold gradient, a whisper of
 * woven paper, and a low sun disc. Filipino golden hour, kept quiet: the
 * color does the work, no ornaments.
 */
export function GradientHeader({ title, subtitle, children, bare }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const hero = isDark ? gradientsDark.hero : gradientsLight.hero;
  const titleColor = isDark ? '#F2F6FA' : '#1A2B3C';
  const eyebrowColor = isDark ? '#E9C87E' : '#A3691F';

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.lg, backgroundColor: hero[0] }]}>
      <LinearGradient colors={hero} start={{ x: 0, y: 0 }} end={{ x: 0.25, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image
        source={
          isDark
            ? require('../../assets/textures/weave-dark.png')
            : require('../../assets/textures/weave-light.png')
        }
        resizeMode="cover"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.10 : 0.14 }]}
      />
      {/* low sun over the water */}
      <View pointerEvents="none" style={[styles.sun, { backgroundColor: isDark ? 'rgba(233,200,126,0.10)' : 'rgba(255,255,255,0.45)' }]} />
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
