import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  children: React.ReactNode;
  /** How much to shrink while pressed. Keep it subtle. */
  scaleTo?: number;
  disabled?: boolean;
  /** Light haptic tap on press (default: off). */
  haptic?: boolean | 'light' | 'medium';
}

/**
 * Pressable with premium tactile feel: quick ease-in scale on touch,
 * springy release, optional light haptic tick.
 */
export function PressableScale({ onPress, onLongPress, style, children, scaleTo = 0.97, disabled, haptic }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      speed: 42,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 26,
      bounciness: 7,
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
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
