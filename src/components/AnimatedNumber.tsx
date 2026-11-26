import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TextStyle } from 'react-native';

interface Props {
  value: number;
  format: (n: number) => string;
  style?: TextStyle | TextStyle[];
}

/**
 * Counts from the previous value to the new one (650ms, ease-out) and adds
 * a tiny scale pulse on every change, so a fresh amount visibly "lands".
 */
export function AnimatedNumber({ value, format, style }: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const anim = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(from + (to - from) * v));
    Animated.timing(anim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // JS-driven so the listener fires
    }).start();
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }),
    ]).start();
    return () => anim.removeListener(id);
  }, [value, anim, pulse]);

  return (
    <Animated.Text style={[style, { transform: [{ scale: pulse }] }]}>{format(display)}</Animated.Text>
  );
}
