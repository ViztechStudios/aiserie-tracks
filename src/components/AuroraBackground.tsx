import React from 'react';
import { Animated, Image, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../store/ThemeContext';

const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

interface Props {
  /** Kept for call-site compatibility; the backdrop is intentionally quiet. */
  intensity?: number;
}

/**
 * Fixed backdrop behind every screen: capiz-paper in light, midnight ink in
 * dark, both with a barely-there woven texture and a faint warm light at the
 * top edge. Material, not decoration.
 */
export function AuroraBackground({ intensity = 1 }: Props) {
  const { progress, aurora } = useTheme();
  const lightOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const darkOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const style: ViewStyle = { ...ABS_FILL, overflow: 'hidden' };
  return (
    <View pointerEvents="none" style={style}>
      {/* capiz paper */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lightOpacity, backgroundColor: aurora.base }]}>
        <Animated.Image
          source={require('../../assets/textures/weave-light.png')}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: aurora.weaveOpacity }]}
        />
        <LinearGradient
          colors={[aurora.glow, 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 } as ViewStyle}
        />
      </Animated.View>
      {/* midnight ink */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: darkOpacity, backgroundColor: aurora.base }]}>
        <Animated.Image
          source={require('../../assets/textures/weave-dark.png')}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: aurora.weaveOpacity }]}
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
