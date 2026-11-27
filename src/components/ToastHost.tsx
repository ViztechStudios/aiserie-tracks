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
 * Slides up with a soft ease-out and gently settles (v4.4.0: no spring).
 */
export function ToastHost() {
  const ui = useUI();
  const { t, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  const state = ui.toastState;
  const msg = state?.message;

  useEffect(() => {
    if (!msg) return;
    opacity.setValue(0);
    rise.setValue(16);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 10, duration: 220, useNativeDriver: true }),
      ]).start();
    }, 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg, state?.id]);

  if (!msg) return null;

  // v4.2.0: the toast speaks in tones — success lands green, error lands red,
  // plain info keeps the classic fern pill (one voice, three volumes)
  const kind = state?.kind ?? 'info';
  const tone =
    kind === 'success'
      ? { bg: isDark ? 'rgba(9,46,30,0.96)' : 'rgba(18,94,60,0.96)', icon: 'checkmark-circle' as const, color: '#9FE7C0' }
      : kind === 'error'
        ? { bg: isDark ? 'rgba(56,20,18,0.96)' : 'rgba(148,54,48,0.96)', icon: 'warning' as const, color: '#FFC9CD' }
        : { bg: isDark ? 'rgba(6,26,16,0.96)' : 'rgba(13,59,39,0.96)', icon: 'information-circle' as const, color: t.sun300 ?? '#F0D492' };

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, transform: [{ translateY: rise }] }]}
    >
      <View style={[styles.pill, { backgroundColor: tone.bg }]}>
        <Ionicons name={tone.icon} size={17} color={tone.color} />
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
