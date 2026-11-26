import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUI } from '../store/UIContext';
import { useTheme } from '../store/ThemeContext';
import { font, radius, spacing } from '../theme';

/**
 * Themed notice pill for validation messages and confirmations — replaces
 * Alert.alert(), which react-native-web implements as an empty function
 * (alerts were literally invisible on the PWA, making "dead button" bugs).
 */
export function ToastHost() {
  const ui = useUI();
  const { t, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const state = ui.toastState;
  const msg = state?.message;

  useEffect(() => {
    if (!msg) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }, 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg, state?.id]);

  if (!msg) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity }]}
    >
      <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(6,26,16,0.96)' : 'rgba(13,59,39,0.96)' }]}>
        <Ionicons name="information-circle" size={17} color={t.sun300 ?? '#F0D492'} />
        <Text style={styles.text} numberOfLines={3}>
          {msg}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 108,
    alignItems: 'center',
    paddingHorizontal: spacing.xl + 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.lg,
    maxWidth: 420,
    // both shadow languages — web ignores the native trio, native ignores boxShadow
    ...(Platform.select({
      web: { boxShadow: '0 10px 26px rgba(6,24,15,0.35)' },
      default: {
        shadowColor: '#06180F',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      },
    }) as object),
  },
  text: {
    fontFamily: font.bold,
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    flexShrink: 1,
  },
});
