import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, gradientsDark, gradientsLight, spacing } from '../theme';
import { useTheme } from '../store/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Page header — a deep sea-ink panel. One calm gradient, a whisper of woven
 * paper, and clean type. No ornaments: the header's job is to set the ink
 * tone of the page and hold the hero card. Straight bottom edge — content
 * below stays on the paper grid.
 */
export function GradientHeader({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const header = isDark ? gradientsDark.header : gradientsLight.header;
  const weaveTint = isDark ? '#7CC3DC' : '#E9DFC8';
  const weaveOpacity = isDark ? 0.07 : 0.09;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl, backgroundColor: header[0] }]}>
      <LinearGradient colors={header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1.05 }} style={StyleSheet.absoluteFill} />
      <Image
        source={require('../../assets/textures/weave.png')}
        resizeMode="cover"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: weaveOpacity, tintColor: weaveTint }]}
      />
      <View style={styles.content}>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>
        ) : null}
        <Text style={styles.title}>{title}</Text>
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
  /** Small caps eyebrow above the title — one quiet cue, not an ornament. */
  subtitle: {
    color: 'rgba(233,200,126,0.92)',
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: font.display,
    fontSize: 27,
    letterSpacing: 0.1,
  },
});
