import React from 'react';
import { Animated, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { darkColors, glass, lightColors, mix, radius } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { PressableScale } from './PressableScale';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds gentle press feedback and calls onPress. */
  onPress?: () => void;
  onLongPress?: () => void;
  /** Hero treatment: stronger shadow + a single gold rule along the top. */
  hi?: boolean;
  /** Overrides the glass fill (e.g. tinted surfaces). */
  tint?: string;
  /** Text styles helper: themed primary text color for labels inside the card. */
  textStyle?: TextStyle;
}

/**
 * The one glass surface used across the app: a translucent frosted fill that
 * lets the aurora backdrop glow through, a hairline edge and a soft top
 * sheen — the light source that makes the frost read as glass. Hero cards
 * carry a single gold rule along their top edge — one quiet, crafted
 * signature instead of a rainbow of effects.
 */
export function GlassCard({ children, style, onPress, onLongPress, hi, tint }: Props) {
  const { progress, isDark, shadow } = useTheme();
  const surface: Animated.WithAnimatedValue<StyleProp<ViewStyle>> = [
    styles.base,
    glass.surface,
    {
      backgroundColor: tint ?? mix(progress, lightColors.card, darkColors.card),
      borderColor: mix(progress, lightColors.glassBorder, darkColors.glassBorder),
    },
    hi ? shadow.cardHi : shadow.card,
    style,
  ];
  const body = (
    <>
      {/* the light source: a soft sheen falling across the top of the pane */}
      <LinearGradient
        colors={isDark ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.08)']}
        locations={[0, 1]}
        pointerEvents="none"
        style={styles.sheen}
      />
      {hi ? <View pointerEvents="none" style={[styles.goldRule, { backgroundColor: isDark ? darkColors.sun500 : lightColors.sun500 }]} /> : null}
      {children}
    </>
  );
  if (onPress || onLongPress) {
    return (
      <PressableScale onPress={onPress} onLongPress={onLongPress} style={surface}>
        {body}
      </PressableScale>
    );
  }
  return <Animated.View style={surface}>{body}</Animated.View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: 18,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
  },
  goldRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.85,
  },
});
