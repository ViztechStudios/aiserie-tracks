import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinance } from '../store/FinanceContext';
import { useLock } from '../store/LockContext';
import { font, spacing } from '../theme';

/**
 * The privacy shield (v4.0.0): the moment Aiserie leaves the foreground —
 * app switcher, another app, the screen going dark — a branded curtain
 * slides over everything so balances are never visible to a bystander or
 * in the task-switcher snapshot. When you come back it lifts again
 * (unless the PIN lock is on, in which case the pin pad greets you on top
 * of the curtain).
 *
 * Off by default for nobody: ON unless the user turns it off in
 * Settings -> Privacy & storage, including for data created before v4.
 *
 * Animation rule learned from the v3.0.x crash: this overlay animates ONLY
 * its opacity with the native driver — a single-node graph, never mixed.
 */
export function PrivacyShield() {
  const finance = useFinance();
  const lock = useLock();
  const [covered, setCovered] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const enabled = finance.settings.privacyShield !== false; // privacy-first default
  const pinHolds = Boolean(lock.config?.enabled && !lock.unlocked);

  useEffect(() => {
    if (!enabled) return;
    let subscription: { remove: () => void } | undefined;
    try {
      const handler = (state: string) => {
        if (state === 'active') {
          // returning — lift the curtain unless the pin gate needs to hold it
          if (pinHolds) {
            setCovered(true);
          } else {
            Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
              setCovered(false);
            });
          }
        } else if (state === 'background' || state === 'inactive') {
          // leaving — slam the curtain shut instantly (no tween: the task
          // switcher may snapshot within milliseconds)
          try {
            opacity.setValue(1);
          } catch {}
          setCovered(true);
        }
      };
      const emitter = AppState.addEventListener?.('change', handler);
      if (emitter && typeof emitter.remove === 'function') subscription = emitter;
      // react-native-web maps visibilitychange into AppState — free privacy
      // when a PWA tab is hidden behind another window
    } catch {
      // no AppState on this runtime — the shield simply never fires
    }
    return () => {
      try {
        subscription?.remove();
      } catch {}
    };
  }, [enabled, pinHolds, opacity]);

  // when the pin unlocks while the curtain is up, lift it
  useEffect(() => {
    if (!covered || !enabled) return;
    if (!pinHolds && AppState.currentState === 'active') {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setCovered(false));
    }
  }, [pinHolds, covered, enabled, opacity]);

  if (!enabled || !covered) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 90, elevation: 90 }]} pointerEvents="auto">
      <LinearGradient colors={['#12402F', '#0B2C20']} style={styles.fill}>
        <View style={[styles.blob, styles.blobA]} />
        <View style={[styles.blob, styles.blobB]} />
        <View style={[styles.blob, styles.blobC]} />
        <View style={styles.inner}>
          <View style={styles.mascotBubble}>
            <Image source={require('../../assets/mascot-wave.png')} style={styles.mascot} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Aiserie is tucked away</Text>
          <Text style={styles.sub}>
            Your balances stay private on this device —{Platform.OS === 'web' ? ' ' : '\n'}nothing leaves it, ever.
          </Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Return to Aiserie to continue</Text>
          </View>
        </View>
        <Text style={styles.credit}>Made by Viztech Studios</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B2C20' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)' },
  blobA: { width: 320, height: 320, top: -90, left: -70 },
  blobB: { width: 260, height: 260, bottom: -60, right: -50, backgroundColor: 'rgba(240,212,146,0.07)' },
  blobC: { width: 180, height: 180, top: '55%', left: 40, backgroundColor: 'rgba(159,231,192,0.05)' },
  inner: { alignItems: 'center', paddingHorizontal: spacing.xl },
  mascotBubble: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  mascot: { width: 82, height: 82, marginTop: 6 },
  title: { fontFamily: font.display, fontSize: 22, color: '#FFFFFF', marginTop: spacing.lg, textAlign: 'center' },
  sub: {
    fontFamily: font.medium, fontSize: 13, color: 'rgba(240,248,243,0.75)',
    marginTop: 8, textAlign: 'center', lineHeight: 19,
  },
  pill: {
    marginTop: spacing.lg, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  pillText: { fontFamily: font.bold, fontSize: 12, color: '#F0D492', letterSpacing: 0.4 },
  credit: {
    position: 'absolute', bottom: 24, fontFamily: font.medium, fontSize: 10,
    color: 'rgba(240,248,243,0.4)', letterSpacing: 0.6,
  },
});
