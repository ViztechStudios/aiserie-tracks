import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/ThemeContext';
import { useUI } from '../store/UIContext';
import { brandOcean, font, radius, shadow, spacing } from '../theme';
import { dismissUpdate, openReleases } from '../services/updateCheck';
import { PressableScale } from './PressableScale';
import { useResponsive } from '../hooks/useResponsive';

/**
 * "Update available" nudge — a paper card that springs in over the current
 * screen and deep-links to the GitHub releases page (the app's official
 * distribution channel for Android APKs and the PWA).
 */
export function UpdateModal() {
  const { t } = useTheme();
  const ui = useUI();
  const { sheetWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const visible = ui.updateInfo !== null;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      fade.setValue(0);
      Animated.parallel([
        // v4.4.0: calm settle — no bounce on the update sheet
        Animated.timing(scale, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
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
            { marginBottom: insets.bottom + 40, transform: [{ scale }] },
          ]}
        >
          <View style={[styles.card, { backgroundColor: t.cardSolid, borderColor: t.glassBorderSoft }, shadow.cardHi]}>
            <View style={[styles.badge, { backgroundColor: t.ice100 }]}>
              <Ionicons name="cloud-download-outline" size={24} color={t.ocean600} />
            </View>
            <Text style={[styles.title, { color: t.text }]}>Update available</Text>
            <Text style={[styles.body, { color: t.subtext }]}>
              {isWeb
                ? `Aiserie Tracks v${info?.latestVersion} just shipped. Refresh this page for the latest version — or grab the Android app from GitHub.`
                : `Aiserie Tracks v${info?.latestVersion} is out (you have v${info?.currentVersion}). Get the updated APK from GitHub — installs in seconds.`}
            </Text>
            {info?.notes ? <Text style={[styles.notes, { color: t.subtext }]} numberOfLines={2}>{info.notes}</Text> : null}
            <PressableScale onPress={() => { close(); openReleases(); }} haptic="medium" style={styles.ctaWrap}>
              <LinearGradient
                colors={[brandOcean, '#2E9B63']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Ionicons name="logo-github" size={18} color={t.white} />
                <Text style={[styles.ctaText, { color: t.white }]}>Update from GitHub</Text>
              </LinearGradient>
            </PressableScale>
            <Pressable onPress={close} hitSlop={10}>
              <Text style={[styles.later, { color: t.faint }]}>Maybe later</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(4,16,31,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  cardWrap: { width: '100%' },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    ...Platform.select({ web: { boxShadow: '0 18px 44px rgba(7,47,82,0.30)' } }),
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: font.bold, fontSize: 19, letterSpacing: 0.1 },
  body: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm + 2, paddingHorizontal: 4 },
  notes: { fontFamily: font.medium, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: spacing.sm },
  ctaWrap: { alignSelf: 'stretch', marginTop: spacing.lg, borderRadius: radius.md },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  ctaText: { fontFamily: font.bold, fontSize: 15 },
  later: { marginTop: spacing.md, fontFamily: font.bold, fontSize: 13 },
});
