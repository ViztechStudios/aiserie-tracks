import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TextStyle } from 'react-native';

interface Props {
  value: number;
  format: (n: number) => string;
  style?: TextStyle | TextStyle[];
  /**
   * Flash the number briefly when the value changes: `auto` tints toward the
   * income colour when the value rose and the expense colour when it fell;
   * `up`/`down` force a direction; `none` disables. Requires `restingColor`.
   */
  flash?: 'auto' | 'up' | 'down' | 'none';
  /** The resting colour the number returns to after the flash. */
  restingColor?: string;
  /** Override the flash colours (defaults fit the Fern & Bark palette). */
  flashUpColor?: string;
  flashDownColor?: string;
  /** Duration of the count tween, ms. */
  duration?: number;
}

const EASE = Easing.out(Easing.cubic);
const UP = '#2E9E6B';
const DOWN = '#C4554D';

/**
 * The money counter used across the app: it counts from the previous value to
 * the new one with an ease-out tween, springs a tiny scale pulse so a fresh
 * amount visibly "lands", and (optionally) flashes toward the income or
 * expense colour for a beat before settling back.
 *
 * THE CRASH RULE (v4.0.0): one animated props graph may only ever contain
 * nodes for ONE driver. v3.0.x put the native-driven `pulse` scale and the
 * JS-driven `tint` colour on the SAME <Animated.Text> — starting the native
 * pulse moved that whole graph to native, so the very next JS-driven tint
 * crashed with "JS driver animations for animated nodes that have been moved
 * to 'native'" (the add-a-balance white screen). Now the native-driven scale
 * lives on its own wrapper <Animated.View> and the JS-driven colour and
 * digits live on the inner <Animated.Text>: two disjoint graphs, never mixed.
 * Every animation start is additionally guarded so an animation can never
 * take the number down even if React Native changes under us.
 */
export function AnimatedNumber({
  value: rawValue,
  format,
  style,
  flash = 'none',
  restingColor,
  flashUpColor = UP,
  flashDownColor = DOWN,
  duration = 650,
}: Props) {
  // NaN/Infinity (e.g. a wallet row missing openingBalance) must never paint
  // "NaN" or feed the tween — settle on zero instead.
  const value = Number.isFinite(rawValue) ? rawValue : 0;
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  // graph 1 — NATIVE driver only: the landing pulse (transform on the wrapper)
  const pulse = useRef(new Animated.Value(1)).current;
  // graph 2 — JS driver only: the count tween (unattached value, read via a
  // listener) and the flash tint (colour interpolation on the inner text)
  const anim = useRef(new Animated.Value(1)).current;
  const tint = useRef(new Animated.Value(0)).current; // 0 = resting, 1 = flash colour
  const [flashColor, setFlashColor] = useState(flashUpColor);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    let id = '';
    try {
      anim.stopAnimation();
      anim.setValue(0);
      id = anim.addListener(({ value: v }) => setDisplay(from + (to - from) * v));
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: EASE,
        useNativeDriver: false, // JS-driven so the listener fires
      }).start();
    } catch {
      // the count tween is cosmetic — if it cannot run, snap to the answer
      setDisplay(to);
    }
    try {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.045, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }),
      ]).start();
    } catch {
      try {
        pulse.setValue(1);
      } catch {}
    }
    if (flash !== 'none' && restingColor) {
      const color = flash === 'down' ? flashDownColor : flash === 'up' ? flashUpColor : to < from ? flashDownColor : flashUpColor;
      setFlashColor(color);
      try {
        tint.stopAnimation();
        tint.setValue(0);
        Animated.sequence([
          Animated.timing(tint, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.timing(tint, { toValue: 0, duration: 640, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        ]).start();
      } catch {
        try {
          tint.setValue(0);
        } catch {}
      }
    }
    return () => {
      try {
        if (id) anim.removeListener(id);
      } catch {}
    };
  }, [value, anim, pulse, tint, flash, restingColor, flashUpColor, flashDownColor, duration]);

  const interpolated =
    flash !== 'none' && restingColor
      ? tint.interpolate({ inputRange: [0, 1], outputRange: [restingColor, flashColor] })
      : restingColor;

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Animated.Text style={[style, interpolated ? { color: interpolated as unknown as string } : null]}>
        {format(display)}
      </Animated.Text>
    </Animated.View>
  );
}
