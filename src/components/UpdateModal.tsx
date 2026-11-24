import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/ThemeContext';
import { useUI } from '../store/UIContext';
import { mix, radius, spacing } from '../theme';
import { dismissUpdate, openReleases } from '../services/updateCheck';
import { PressableScale } from './PressableScale';
import { useResponsive } from '../hooks/useResponsive';

/**
 * "Update available" nudge — glass card that springs in over the current
 * screen and deep-links to the GitHub releases page (the app's official
 * distribution channel for Android APKs and the PWA).
 */
export function UpdateModal() {
  const { t, progress } = useTheme();
  const ui = useUI();
  const { sheetWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.86)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const visible = ui.updateInfo !== null;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.86);
      fade.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scale, fade]);

  const close = () => {
    if (ui.updateInfo) dismissUpdate(ui.updateInfo.latestVersion);
    ui.closeUpdate();
  };

  const info = ui.updateInfo;
  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <Animated.View
          style={[
            styles.cardWrap,
            sheetWidth ? { maxWidth: sheetWidth } : null,
            { marginBottom: insets.top + 40, transform: [{ scale }] },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <LinearGradient
                colors={[t.ocean600, t.aqua400]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badge}
              >
                <Ionicons name="cloud-download" size={22} color={t.white} />
              </LinearGradient>
              <View style={styles.badgeGlow} />
            </View>
            <Animated.Text style={[styles.title, { color: mix(progress, lightText, darkText) }]}>Update available</Animated.Text>
            <Animated.Text style={[styles.body, { color: mix(progress, lightSub, darkSub) }]}>
              {isWeb
                ? `Aiserie Tracks v${info?.latestVersion} just shipped. Refresh this page for the latest version — or grab the Android app from GitHub.`
                : `Aiserie Tracks v${info?.latestVersion} is out (you have v${info?.currentVersion}). Get the updated APK from GitHub — installs in seconds.`}
            </Animated.Text>
            {info?.notes ? <Animated.Text style={[styles.notes, { color: mix(progress, lightSub, darkSub) }]} numberOfLines={2}>{info.notes}</Animated.Text> : null}
            <PressableScale onPress={() => { close(); openReleases(); }} haptic="medium" style={styles.ctaWrap}>
              <LinearGradient
                colors={[t.ocean900, t.ocean600, t.aqua300]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Ionicons name="logo-github" size={18} color={t.white} />
                <Text style={[styles.ctaText, { color: t.white }]}>Update from GitHub</Text>
              </LinearGradient>
            </PressableScale>
            <Pressable onPress={close} hitSlop={10}>
              <Animated.Text style={[styles.later, { color: mix(progress, lightFaint, darkFaint) }]}>Maybe later</Animated.Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const lightText = '#0B3954';
const darkText = '#EAF4FF';
const lightSub = '#5E7C96';
const darkSub = '#9FB8D9';
const lightFaint = '#93ACBF';
const darkFaint = '#6E8CAD';

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(4,16,31,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  cardWrap: { width: '100%' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    padding: spacing.xl,
    alignItems: 'center',
    ...Platform.select({ web: { boxShadow: '0 24px 60px rgba(7,47,82,0.35)' } }),
  },
  badgeRow: { marginBottom: spacing.md, position: 'relative' },
  badge: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  badgeGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(14,165,233,0.20)',
    zIndex: -1,
  },
  title: { fontSize: 21, fontWeight: '900', letterSpacing: 0.2 },
  body: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm + 2, paddingHorizontal: 4 },
  notes: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
  ctaWrap: { alignSelf: 'stretch', marginTop: spacing.lg, borderRadius: radius.md },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  ctaText: { fontWeight: '900', fontSize: 15 },
  later: { marginTop: spacing.md, fontSize: 13, fontWeight: '700' },
});
