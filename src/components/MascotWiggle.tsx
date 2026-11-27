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
 * pup and tabby feel alive while a screen is open. v4.4.0: deliberately
 * quieter — shallower travel, gentler tilt, slower cycle. Personality, not
 * noise. Runs everywhere including web (one composited transform pair is
 * cheap even on older iPhones).
 */
export function MascotWiggle({ children, bob = 3, tilt = 1.4, duration = 3200, delay = 0, style }: Props) {
  const phase = useRef(new Animated.Value(0)).current;
  // v4.4.0: calm whatever the call site asked for — 60% of the bob, 55% of
  // the tilt — so no mascot anywhere loops too lively
  const calmBob = bob * 0.6;
  const calmTilt = tilt * 0.55;

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

  const translateY = phase.interpolate({ inputRange: [0, 1], outputRange: [0, -calmBob] });
  const rotate = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [`${-calmTilt}deg`, '0deg', `${calmTilt}deg`] });

  return (
    <Animated.View pointerEvents="none" style={[style, { transform: [{ translateY }, { rotate }] }]}>
      {children}
    </Animated.View>
  );
}
