import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';

interface Props {
  delay?: number; // ms
  distance?: number; // px to travel up
  pop?: boolean; // also scale 0.92 -> 1 (springy overshoot)
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Springy entrance: the card rises, fades in and lands with a soft
 * overshoot (a real bounce, not a straight fade). One-shot on mount —
 * safe to wrap any card or list row.
 *
 * On web the spring is slightly firmer than on native so tab switches
 * stay crisp, but it keeps the same lively character.
 */
export function Entrance({ delay = 0, distance = 22, pop = true, children, style }: Props) {
  const isWeb = Platform.OS === 'web';
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      delay: isWeb ? 0 : delay,
      friction: isWeb ? 9 : 7,
      tension: isWeb ? 110 : 80,
      useNativeDriver: true,
    }).start();
  }, [progress, delay, isWeb]);

  const scale = pop
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [isWeb ? 0.96 : 0.92, 1] })
    : 1;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }),
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
