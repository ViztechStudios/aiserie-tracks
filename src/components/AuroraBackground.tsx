import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../store/ThemeContext';

const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

interface Props {
  /** Kept for call-site compatibility; the backdrop is intentionally quiet. */
  intensity?: number;
}

/**
 * Fixed backdrop behind every screen: capiz-paper in light, midnight ink in
 * dark — with a woven texture, two soft light orbs the glass cards refract,
 * and a faint warm light at the top edge. Material, not decoration.
 */
export function AuroraBackground({ intensity = 1 }: Props) {
  const { isDark, aurora } = useTheme();
  // v4.2.0: the cross-fade value lives here now — local to this component,
  // single-driver (opacity, native), and never shared with anything that
  // could attach a JS animation to it (the v4.1.0 crash shape).
  const fade = useRef(new Animated.Value(isDark ? 1 : 0)).current; // 0 = light
  useEffect(() => {
    try {
      Animated.timing(fade, {
        toValue: isDark ? 1 : 0,
        duration: 460,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true, // opacity only — the sole driver this graph ever sees
      }).start();
    } catch {
      /* never let a backdrop animation take the app down */
    }
  }, [isDark, fade]);
  const lightOpacity = fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const darkOpacity = fade.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const style: ViewStyle = { ...ABS_FILL, overflow: 'hidden' };
  return (
    <View pointerEvents="none" style={style}>
      {/* capiz paper */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lightOpacity, backgroundColor: aurora.base }]}>
        <Animated.Image
          source={require('../../assets/textures/weave-light.png')}
          resizeMode="cover"
          style={[styles.weaveFill, { opacity: aurora.weaveOpacity }]}
        />
        {/* the light the glass refracts: one leaf orb, one warm orb */}
        <LinearGradient
          colors={['rgba(151,199,168,0.40)', 'rgba(151,199,168,0)']}
          style={styles.orbA}
        />
        <LinearGradient
          colors={['rgba(217,161,59,0.18)', 'rgba(217,161,59,0)']}
          style={styles.orbB}
        />
        <LinearGradient
          colors={[aurora.glow, 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 } as ViewStyle}
        />
      </Animated.View>
      {/* jungle night — v4.3.0 showroom glows: a wide mint moon up top, a
          deep leaf orb below, and a whisper of gold so warm tones survive */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: darkOpacity, backgroundColor: aurora.base }]}>
        <Animated.Image
          source={require('../../assets/textures/weave-dark.png')}
          resizeMode="cover"
          style={[styles.weaveFill, { opacity: aurora.weaveOpacity }]}
        />
        <LinearGradient
          colors={['rgba(62,207,160,0.20)', 'rgba(62,207,160,0)']}
          style={styles.orbA}
        />
        <LinearGradient
          colors={['rgba(46,94,66,0.38)', 'rgba(46,94,66,0)']}
          style={styles.orbB}
        />
        <LinearGradient
          colors={['rgba(229,185,92,0.07)', 'rgba(229,185,92,0)']}
          style={styles.orbC}
        />
        <LinearGradient
          colors={[aurora.glow, 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 } as ViewStyle}
        />
      </Animated.View>
      {/* keeps Android overflow clipping happy without extra layers */}
      {Platform.OS === 'android' ? <View style={styles.spacer} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { width: 1, height: 1 },
  // soft light orbs — big radial fades the frosted cards appear to refract
  orbA: { position: 'absolute', top: -160, right: -110, width: 500, height: 500, borderRadius: 250 },
  orbB: { position: 'absolute', bottom: -130, left: -110, width: 400, height: 400, borderRadius: 200 },
  orbC: { position: 'absolute', top: 180, left: -90, width: 320, height: 320, borderRadius: 160 },
  // Web note: with bare absoluteFill insets, react-native-web keeps the Image
  // at its intrinsic 480px size, which split wide screens with a seam. Percent
  // sizing stretches the texture to the real viewport on web and native alike.
  weaveFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
