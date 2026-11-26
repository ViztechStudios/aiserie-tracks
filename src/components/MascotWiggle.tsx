import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  /** Vertical travel in px (half the bob). */
  bob?: number;
  /** Rocking tilt in degrees. */
  tilt?: number;
  /** Full cycle duration in ms. */
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Idle "breathing" loop for the mascots — a soft bob plus a tiny tilt so the
 * pup and tabby feel alive while a screen is open. Deliberately slow and
 * small: personality, not noise. Runs everywhere including web (one
 * composited transform pair is cheap even on older iPhones).
 */
export function MascotWiggle({ children, bob = 4, tilt = 2.2, duration = 2200, delay = 0, style }: Props) {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(phase, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [phase, duration, delay]);

  const translateY = phase.interpolate({ inputRange: [0, 1], outputRange: [0, -bob] });
  const rotate = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [`${-tilt}deg`, '0deg', `${tilt}deg`] });

  return (
    <Animated.View pointerEvents="none" style={[style, { transform: [{ translateY }, { rotate }] }]}>
      {children}
    </Animated.View>
  );
}
