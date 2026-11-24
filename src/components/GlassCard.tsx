import React from 'react';
import { Animated, StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { darkColors, glass, lightColors, mix, radius } from '../theme';
import { useTheme } from '../store/ThemeContext';
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
  /** Text styles helper: themed primary text color for labels inside the card. */
  textStyle?: TextStyle;
}

/**
 * The one glass surface used across the app: frosted fill, a hairline
 * highlight border and a large soft ocean shadow. Over the aurora wash this
 * reads as real frosted glass; inside the gradient header it reads as glass
 * laid over the ocean. Fill and border cross-fade when the theme changes.
 */
export function GlassCard({ children, style, onPress, onLongPress, hi, tint }: Props) {
  const { progress, isDark, shadow } = useTheme();
  const surface: Animated.WithAnimatedValue<StyleProp<ViewStyle>> = [
    styles.base,
    glass.surface,
    hi ? styles.hi : null,
    {
      backgroundColor: tint ?? mix(progress, lightColors.card, darkColors.card),
      borderColor: mix(
        progress,
        hi ? lightColors.glassBorder : lightColors.glassBorderSoft,
        hi ? darkColors.glassBorder : darkColors.glassBorderSoft
      ),
    },
    hi ? shadow.cardHi : shadow.card,
    style,
  ];
  if (onPress || onLongPress) {
    return (
      <PressableScale onPress={onPress} onLongPress={onLongPress} style={surface}>
        {children}
      </PressableScale>
    );
  }
  return <Animated.View style={surface}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: 18,
  },
  hi: {},
});
