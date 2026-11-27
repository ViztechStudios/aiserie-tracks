import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glass, radius } from '../theme';
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
 *
 * v4.2.0 stability note: the fill/border read the resolved palette directly
 * instead of animating colors from a shared theme value. Mixing an animated
 * color interpolation into PressableScale's native-driven style graph is what
 * crashed v4.1.0 on every theme flip (see ThemeContext). Glass now snaps to
 * the new scheme instantly while the aurora backdrop keeps its cross-fade.
 */
export function GlassCard({ children, style, onPress, onLongPress, hi, tint }: Props) {
  const { t, isDark, shadow } = useTheme();
  const surface: StyleProp<ViewStyle> = [
    styles.base,
    glass.surface,
    {
      backgroundColor: tint ?? t.card,
      borderColor: t.glassBorder,
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
      {hi ? <View pointerEvents="none" style={[styles.goldRule, { backgroundColor: t.sun500 }]} /> : null}
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
  return <View style={surface}>{body}</View>;
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
