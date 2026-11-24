import React, { useRef } from 'react';
import { Animated, Easing, Pressable, StyleProp, ViewStyle } from 'react-native';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** How much to shrink while pressed. Keep it subtle. */
  scaleTo?: number;
  disabled?: boolean;
}

/** Pressable that gently scales down while touched (120ms). */
export function PressableScale({ onPress, onLongPress, style, children, scaleTo = 0.97, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.timing(scale, {
      toValue: scaleTo,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
