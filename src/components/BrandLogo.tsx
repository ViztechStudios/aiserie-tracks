import React from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../store/ThemeContext';

/**
 * The one brand-tile renderer (v4.4.0). Every asset in assets/banks is a
 * tight, edge-to-edge squircle with a uniform corner radius (see
 * scripts/logo_normalize.py), so the tile only has to: size the image to the
 * box, clip it to the matching radius, and add a hairline edge — white tiles
 * need that edge to stay legible on mint paper and on glass.
 *
 * Replaces the old padded-contain renders, where each brand's baked-in
 * margins made some logos look huge and others tiny inside the same slot.
 */
export function BrandLogo({
  logo,
  size = 40,
  style,
}: {
  logo: ImageSourcePropType;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.225,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderWidth: size >= 28 ? 1 : StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(19,54,36,0.10)',
        },
        style,
      ]}
    >
      <Image source={logo} style={styles.img} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%' },
});
