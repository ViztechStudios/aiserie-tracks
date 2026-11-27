import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
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
 * Pressable with a juicy tactile feel: quick sink on touch, springy
 * overshoot on release (the button visibly bounces back), optional light
 * haptic tick.
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

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      speed: 46,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 22,
      bounciness: 10,
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
