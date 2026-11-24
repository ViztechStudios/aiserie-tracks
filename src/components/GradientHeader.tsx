import React from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, gradientsDark, gradientsLight, lightColors, radius, spacing } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { ViewStyle } from 'react-native';

const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

interface Props {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Page header — "dusk over the bay": a deep, calm two-stop gradient with a
 * woven banig texture, a short gold stitch above the title (the thread that
 * runs through the whole system) and a serif title. No blobs, no glow, no
 * sheen — depth comes from color, not effects.
 */
export function GradientHeader({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();
  const { progress } = useTheme();
  const lightOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const darkOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const fallback = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [gradientsLight.header[0], gradientsDark.header[0]],
  });
  return (
    <Animated.View style={[styles.wrap, { paddingTop: insets.top + spacing.lg, backgroundColor: fallback }]}>
      {/* light scheme — deep sea at dusk */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lightOpacity }]}>
        <LinearGradient colors={gradientsLight.header} start={{ x: 0, y: 0 }} end={{ x: 1.1, y: 1.15 }} style={StyleSheet.absoluteFill} />
        <Image
          source={require('../../assets/textures/banig.png')}
          resizeMode="cover"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: 0.08, tintColor: '#FFFFFF' }]}
        />
      </Animated.View>
      {/* dark scheme — midnight Manila */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: darkOpacity }]}>
        <LinearGradient colors={gradientsDark.header} start={{ x: 0, y: 0 }} end={{ x: 1.1, y: 1.15 }} style={StyleSheet.absoluteFill} />
        <Image
          source={require('../../assets/textures/banig.png')}
          resizeMode="cover"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: 0.10, tintColor: '#7CC3DC' }]}
        />
      </Animated.View>
      <View style={styles.content}>
        {/* gold stitch — the woven thread that marks every page */}
        <View pointerEvents="none" style={styles.stitchRow}>
          <View style={styles.stitch} />
          <View style={[styles.stitch, styles.stitchMid]} />
          <View style={styles.stitch} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    </Animated.View>
  );
}

// Re-exported so existing `import { GradientHeader, GlassCard }` call sites keep working.
export { GlassCard } from './GlassCard';

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  content: { zIndex: 1 },
  stitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  stitch: {
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(233,196,106,0.85)',
  },
  stitchMid: { width: 18, backgroundColor: 'rgba(233,196,106,0.95)' },
  title: {
    color: lightColors.white,
    fontFamily: font.display,
    fontSize: 27,
    letterSpacing: 0.1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: font.medium,
    fontSize: 13,
    marginTop: 5,
    letterSpacing: 0.15,
  },
});
