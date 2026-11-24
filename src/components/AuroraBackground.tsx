import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { aurora } from '../theme';

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
 * Fixed decorative colour wash that sits behind every screen. Gives the
 * frosted-glass cards something luminous to diffuse — the core of the
 * premium glass look. Purely static views, no runtime cost.
 */
export function AuroraBackground({ intensity = 1 }: Props) {
  const style: ViewStyle = { ...ABS_FILL, overflow: 'hidden' };
  return (
    <View pointerEvents="none" style={style}>
      <View style={styles.base} />
      <Blob color={aurora.sky} size={340} top={-90} right={-110} opacity={0.34 * intensity} />
      <Blob color={aurora.aqua} size={280} top={90} left={-130} opacity={0.28 * intensity} />
      <Blob color={aurora.lagoon} size={300} bottom={-40} right={-80} opacity={0.22 * intensity} />
      <Blob color={aurora.sky} size={220} bottom={140} left={-90} opacity={0.16 * intensity} />
      {/* keeps Android overflow clipping happy without extra layers */}
      {Platform.OS === 'android' ? <View style={styles.spacer} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { ...ABS_FILL, backgroundColor: '#EFF7FD' },
  spacer: { width: 1, height: 1 },
});
