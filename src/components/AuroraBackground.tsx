import React from 'react';
import { Animated, Image, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../store/ThemeContext';

const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

interface Props {
  /** Tint strength multiplier — dial down for dense screens. */
  intensity?: number;
}

function Blob({
  color,
  size,
  top,
  left,
  right,
  bottom,
  opacity,
}: {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  opacity: number;
}) {
  return (
    <LinearGradient
      colors={[color, 'rgba(255,255,255,0)']}
      start={{ x: 0.5, y: 0.5 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        top,
        left,
        right,
        bottom,
        opacity,
      }}
    />
  );
}

/**
 * Fixed decorative colour wash that sits behind every screen. Light and dark
 * washes are stacked and cross-faded by the theme progress value, and a faint
 * banig weave texture sits on top so the backdrop feels woven, not painted.
 */
export function AuroraBackground({ intensity = 1 }: Props) {
  const { progress, aurora } = useTheme();
  const lightOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const darkOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const weaveOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.055] });
  const style: ViewStyle = { ...ABS_FILL, overflow: 'hidden' };
  return (
    <View pointerEvents="none" style={style}>
      {/* light wash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lightOpacity, backgroundColor: aurora.base }]}>
        <Blob color="#7DD3FC" size={340} top={-90} right={-110} opacity={0.34 * intensity} />
        <Blob color="#A5F3FC" size={280} top={90} left={-130} opacity={0.28 * intensity} />
        <Blob color="#6EE7D8" size={300} bottom={-40} right={-80} opacity={0.22 * intensity} />
        <Blob color="#7DD3FC" size={220} bottom={140} left={-90} opacity={0.16 * intensity} />
      </Animated.View>
      {/* midnight wash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: darkOpacity, backgroundColor: aurora.base }]}>
        <Blob color={aurora.sky} size={360} top={-90} right={-110} opacity={0.55 * intensity} />
        <Blob color={aurora.aqua} size={300} top={90} left={-130} opacity={0.42 * intensity} />
        <Blob color={aurora.lagoon} size={320} bottom={-40} right={-80} opacity={0.34 * intensity} />
        <Blob color={aurora.sky} size={240} bottom={140} left={-90} opacity={0.26 * intensity} />
      </Animated.View>
      {/* banig weave — tinted to stay quiet on both washes */}
      <Animated.Image
        source={require('../../assets/textures/banig.png')}
        resizeMode="cover"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: weaveOpacity, tintColor: '#8FB8D9' }]}
      />
      {/* keeps Android overflow clipping happy without extra layers */}
      {Platform.OS === 'android' ? <View style={styles.spacer} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { width: 1, height: 1 },
});
