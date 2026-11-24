import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface Props {
  delay?: number; // ms
  distance?: number; // px to travel up
  pop?: boolean; // also scale 0.96 -> 1 (springy)
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Premium entrance: fades in, floats up and (optionally) springs in with a
 * gentle scale. One-shot on mount — safe to wrap any card or list row.
 */
export function Entrance({ delay = 0, distance = 18, pop = true, children, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  const scale = pop
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1] })
    : 1;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
            { scale },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
