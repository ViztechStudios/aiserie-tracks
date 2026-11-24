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
  /** Hero treatment: stronger shadow + brighter border + capiz edge. */
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
 * laid over the ocean. Hero cards get a capiz-shell iridescent top edge —
 * the little detail that makes it feel crafted, not generated.
 */
export function GlassCard({ children, style, onPress, onLongPress, hi, tint }: Props) {
  const { progress, isDark, shadow } = useTheme();
  const surface: Animated.WithAnimatedValue<StyleProp<ViewStyle>> = [
    styles.base,
    glass.surface,
    hi && styles.hi,
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
  const body = (
    <>
      {hi ? (
        <View pointerEvents="none" style={styles.capizWrap}>
          <LinearGradient
            colors={['rgba(125,211,252,0.95)', 'rgba(103,232,249,0.80)', 'rgba(246,194,115,0.85)', 'rgba(240,171,252,0.75)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.capiz}
          />
        </View>
      ) : null}
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
  hi: {},
  capizWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  capiz: { flex: 1, opacity: 0.55 },
});
