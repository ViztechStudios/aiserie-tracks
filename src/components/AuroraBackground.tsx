import React from 'react';
import { Animated, Image, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../store/ThemeContext';

const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

interface Props {
  /** Kept for call-site compatibility; the backdrop is intentionally quiet. */
  intensity?: number;
}

/**
 * Fixed backdrop behind every screen: one calm base color per theme and a
 * faint hand-woven banig texture so the surface feels crafted, not painted.
 * No blobs, no glow — the warmth comes from the palette, not from effects.
 */
export function AuroraBackground({ intensity = 1 }: Props) {
  const { progress, aurora } = useTheme();
  const lightOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const darkOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const style: ViewStyle = { ...ABS_FILL, overflow: 'hidden' };
  return (
    <View pointerEvents="none" style={style}>
      {/* capiz cream base */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lightOpacity, backgroundColor: aurora.base }]}>
        <Animated.Image
          source={require('../../assets/textures/banig.png')}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: 0.10, tintColor: '#B29B72' }]}
        />
      </Animated.View>
      {/* midnight Manila base */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: darkOpacity, backgroundColor: aurora.base }]}>
        <Animated.Image
          source={require('../../assets/textures/banig.png')}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: 0.16, tintColor: '#31506B' }]}
        />
      </Animated.View>
      {/* keeps Android overflow clipping happy without extra layers */}
      {Platform.OS === 'android' ? <View style={styles.spacer} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { width: 1, height: 1 },
});
