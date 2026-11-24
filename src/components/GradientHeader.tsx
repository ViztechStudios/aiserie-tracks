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
 * Page header — "dusk over the bay": deep ocean (light) or midnight (dark)
 * gradient, a woven banig texture, a warm sunset glow on the horizon, depth
 * blobs and a capiz-like light sheen. Round-wrapped glass content sits inside.
 */
export function GradientHeader({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();
  const { progress, gradients, aurora } = useTheme();
  const lightOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const darkOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const glowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.26] });
  const fallback = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [gradientsLight.header[1], gradientsDark.header[1]],
  });
  return (
    <Animated.View style={[styles.wrap, { paddingTop: insets.top + spacing.md, backgroundColor: fallback }]}>
      {/* light scheme ocean */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lightOpacity }]}>
        <LinearGradient colors={gradientsLight.header} start={{ x: 0, y: 0 }} end={{ x: 1.25, y: 1.1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* dark scheme midnight */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: darkOpacity }]}>
        <LinearGradient colors={gradientsDark.header} start={{ x: 0, y: 0 }} end={{ x: 1.25, y: 1.1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* woven banig texture — the hand-crafted layer */}
      <Animated.Image
        source={require('../../assets/textures/banig.png')}
        resizeMode="cover"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: 0.07, tintColor: '#FFFFFF' }]}
      />
      {/* sunset glow on the horizon */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={[aurora.glow, 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: 150,
            bottom: -150,
            right: -60,
          }}
        />
      </Animated.View>
      {/* decorative depth blobs */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />
      </View>
      {/* capiz light sheen across the top */}
      <LinearGradient
        colors={gradients.sheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sheen}
        pointerEvents="none"
      />
      <View style={styles.content}>
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
    paddingBottom: spacing.xl + 6,
    borderBottomLeftRadius: radius.lg + 8,
    borderBottomRightRadius: radius.lg + 8,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(103,232,249,0.18)',
    top: -70,
    right: -60,
  },
  blobB: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(7,47,82,0.28)',
    bottom: -60,
    left: -50,
  },
  sheen: { ...ABS_FILL },
  content: { zIndex: 1 },
  title: {
    color: lightColors.white,
    fontFamily: font.display,
    fontSize: 26,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: font.medium,
    fontSize: 13.5,
    marginTop: 3,
    letterSpacing: 0.1,
  },
});
