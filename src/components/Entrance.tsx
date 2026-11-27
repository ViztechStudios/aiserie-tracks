import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';

interface Props {
  delay?: number; // ms
  distance?: number; // px to travel up
  /** v4.4.0: subtle 0.985 → 1 settle (no springy overshoot). Kept for
   *  call-site compatibility; default is now off — a quiet fade-rise reads
   *  more professional than a bounce on every section. */
  pop?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Calm entrance (v4.4.0): the card rises a short distance and fades in on a
 * smooth ease-out — nothing springs, nothing overshoots. One-shot on mount.
 * Web and native share one gentle profile now; tab switches stay crisp
 * because the motion is short, not because it is springy.
 */
export function Entrance({ delay = 0, distance = 12, pop = false, children, style }: Props) {
  const isWeb = Platform.OS === 'web';
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      delay: isWeb ? 0 : delay,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, delay, isWeb]);

  const scale = pop
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] })
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
