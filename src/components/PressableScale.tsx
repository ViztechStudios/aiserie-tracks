import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  /** Layout styles for the outer touch target (flex, width...) — the inner
   *  style only decorates the scaling surface, so row children need this. */
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** How much to shrink while pressed. Keep it subtle. */
  scaleTo?: number;
  disabled?: boolean;
  /** Light haptic tap on press (default: off). */
  haptic?: boolean | 'light' | 'medium';
  /** v4.2.0 accessibility pass-through — icon-only buttons MUST set a label. */
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'tab' | 'imagebutton' | 'none';
  accessibilityHint?: string;
  accessibilityState?: { disabled?: boolean; selected?: boolean; checked?: boolean };
}

/**
 * Pressable with a quiet, professional feel (v4.4.0): a small, quick sink on
 * touch and an ease-out settle back — no spring overshoot, no visible bounce.
 * Call-site scaleTo values are gently dampened (×0.6 of their depth) so every
 * press across the app stays calm even where a deeper value was asked for.
 */
export function PressableScale({
  onPress,
  onLongPress,
  style,
  containerStyle,
  children,
  scaleTo = 0.95,
  disabled,
  haptic,
  accessibilityLabel,
  accessibilityRole,
  accessibilityHint,
  accessibilityState,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  // dampen: 0.88 → ~0.928, 0.94 → ~0.964, default 0.95 → ~0.97
  const target = 1 - (1 - scaleTo) * 0.6;

  const pressIn = () => {
    Animated.timing(scale, {
      toValue: target,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (haptic) {
      const style = haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(style).catch(() => {});
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={containerStyle}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
      accessibilityState={disabled || accessibilityState ? { disabled, ...accessibilityState } : undefined}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
