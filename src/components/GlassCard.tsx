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
  /** Hero treatment: stronger shadow + capiz-shell edge. */
  hi?: boolean;
  /** Overrides the paper fill (e.g. tinted surfaces). */
  tint?: string;
  /** Text styles helper: themed primary text color for labels inside the card. */
  textStyle?: TextStyle;
}

/**
 * The one paper surface used across the app: a solid warm fill, a hairline
 * border and a small directional shadow. Paper, not glass — the depth is in
 * the typography and the capiz-shell iridescent edge that hero cards carry
 * along their top, like light through a windowpane.
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
            colors={[
              'rgba(124,195,220,0.85)',
              'rgba(168,214,224,0.70)',
              'rgba(233,196,106,0.85)',
              'rgba(224,164,78,0.70)',
              'rgba(168,214,224,0.65)',
            ]}
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
  capiz: { flex: 1, opacity: 0.6 },
});
