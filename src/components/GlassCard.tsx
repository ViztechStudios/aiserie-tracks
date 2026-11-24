import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, glass, radius, shadow } from '../theme';
import { PressableScale } from './PressableScale';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds gentle press feedback and calls onPress. */
  onPress?: () => void;
  onLongPress?: () => void;
  /** Hero treatment: stronger shadow + brighter border. */
  hi?: boolean;
  /** Overrides the frosted fill (e.g. tinted glass). */
  tint?: string;
}

/**
 * The one glass surface used across the app: frosted white fill, a hairline
 * highlight border and a large soft ocean shadow. Over the aurora wash this
 * reads as real frosted glass; inside the gradient header it reads as glass
 * laid over the ocean.
 */
export function GlassCard({ children, style, onPress, onLongPress, hi, tint }: Props) {
  const surface: StyleProp<ViewStyle> = [
    styles.base,
    glass.surface,
    hi ? styles.hi : null,
    tint ? { backgroundColor: tint } : null,
    style,
  ];
  if (onPress || onLongPress) {
    return (
      <PressableScale onPress={onPress} onLongPress={onLongPress} style={surface}>
        {children}
      </PressableScale>
    );
  }
  return <View style={surface}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: 18,
  },
  hi: {
    borderColor: colors.glassBorder,
    ...shadow.cardHi,
  },
});
