import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { font } from '../theme';
import { PressableScale } from './PressableScale';

const BOOT_BG: readonly [string, string, string] = ['#05130C', '#0C2E1D', '#123E28'];

interface Props {
  /** Data hydration flag — the curtain dissolves once ready AND the intro has played. */
  ready: boolean;
  onDone: () => void;
}

const INTRO_MIN_MS = 2200;
/** If hydration somehow stalls, the curtain still offers a way in. */
const WATCHDOG_MS = 8500;
const APP_VERSION = Constants.expoConfig?.version ?? '';

/** Standalone copy — this escape path must not depend on any app module. */
const KNOWN_KEYS = [
  'aiserie.v1.transactions',
  'aiserie.v1.accounts',
  'aiserie.v1.settings',
  'aiserie.v1.tasks',
  'aiserie.v1.budgets',
  'aiserie.v1.bills',
  'aiserie.v1.recurring',
  'aiserie.v1.budgetAlerts',
  'aiserie.v1.goals',
  'aiserie.v1.lock',
  'aiserie.v1.updateDismissed',
];

/**
 * Official boot experience (v4.1.0 "Orbit & Frost"):
 * the monogram rises on a frosted glass tile while a quiet satellite traces
 * its orbit; the wordmark settles, three refined ticks land, and the
 * progress line moves in honest stages (fonts, then your data) before the
 * curtain dissolves into the app. If opening takes unusually long, a quiet
 * escape row appears so the app is never a dead end.
 *
 * Animation rule (the v4.0.0 lesson): every animated props graph carries
 * ONE driver only — transforms/opacity run native; the progress width,
 * which needs a layout prop, is the sole JS-driven graph.
 */
export function LoadingScreen({ ready, onDone }: Props) {
  const [mount, setMount] = React.useState(true);
  const [introDone, setIntroDone] = React.useState(false);
  const [stalled, setStalled] = useState(false);
  const [forced, setForced] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const tile = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const ticks = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(tile, { toValue: 1, duration: 640, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.timing(word, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tag, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ticks, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // the satellite: one lap every 2.6 s, forever
    Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true })
    ).start();
    // the tile breathes on a slow sine
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    // honest staged progress: fonts & shell, then data
    Animated.sequence([
      Animated.timing(bar, { toValue: 0.3, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(bar, { toValue: 0.34, duration: 160, useNativeDriver: false }),
      Animated.timing(bar, { toValue: 0.66, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(sheen, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    const timer = setTimeout(() => setIntroDone(true), INTRO_MIN_MS);
    const watchdog = setTimeout(() => setStalled(true), WATCHDOG_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(watchdog);
    };
  }, [tile, orbit, word, tag, ticks, float, bar, sheen]);

  // last beat: finish the bar when the app is actually ready
  const shouldDissolve = (ready || forced) && introDone;

  useEffect(() => {
    if (!ready) return;
    Animated.timing(bar, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [ready, bar]);

  useEffect(() => {
    if (!shouldDissolve || mount === false) return;
    Animated.timing(out, { toValue: 0, duration: 460, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
      setMount(false);
      SplashScreen.hideAsync().catch(() => {});
      onDone();
    });
  }, [shouldDissolve, mount, out, onDone]);

  const continueAnyway = () => setForced(true);

  const resetAndRestart = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    try {
      const keys = (await AsyncStorage.getAllKeys()) as string[];
      const ours = keys.filter((k) => k.startsWith('aiserie.'));
      await AsyncStorage.multiRemove(ours.length ? ours : KNOWN_KEYS);
    } catch {
      try {
        await AsyncStorage.multiRemove(KNOWN_KEYS);
      } catch {
        /* storage is the broken part — continue regardless */
      }
    }
    if (Platform.OS === 'web' && typeof location !== 'undefined') {
      location.reload();
      return;
    }
    continueAnyway();
  };

  if (!mount) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: out, zIndex: 99, elevation: 99 }]}>
      <LinearGradient colors={BOOT_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1.15 }} style={StyleSheet.absoluteFill} />
      {/* the weave, barely there */}
      <Image
        source={require('../../assets/textures/weave.png')}
        resizeMode="cover"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: 0.06, tintColor: '#9BD9B8' }]}
      />
      {/* soft light the glass refracts */}
      <View style={styles.orbWrap} pointerEvents="none">
        <LinearGradient colors={['rgba(159,231,192,0.14)', 'rgba(159,231,192,0)']} style={styles.orbA} />
        <LinearGradient colors={['rgba(233,196,106,0.10)', 'rgba(233,196,106,0)']} style={styles.orbB} />
      </View>
      <View style={styles.center}>
        {/* frosted tile + orbiting satellite */}
        <Animated.View
          style={{
            opacity: tile,
            transform: [
              { scale: tile.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
            ],
          }}
        >
          <View style={styles.orbitFrame}>
            {/* the orbit ring */}
            <View pointerEvents="none" style={styles.orbitRing} />
            {/* the satellite: one glowing dot on the ring, carried by rotation */}
            <Animated.View
              pointerEvents="none"
              style={[styles.orbitSpin, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}
            >
              <View style={styles.satelliteArm}>
                <View style={styles.satellite} />
              </View>
            </Animated.View>
            {/* the monogram on its frost pane */}
            <Animated.View
              style={[styles.pane, { opacity: tile.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}
            >
              <Image source={require('../../assets/splash-icon.png')} style={styles.logo} resizeMode="cover" />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <Text style={styles.title}>Aiserie Tracks</Text>
        </Animated.View>
        <Animated.View style={{ opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <Text style={styles.tagline}>Your money, beautifully tracked</Text>
        </Animated.View>

        {/* three refined ticks — quieter than any mascot */}
        <Animated.View style={[styles.tickRow, { opacity: ticks }]}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={{
                opacity: ticks.interpolate({ inputRange: [i * 0.28, Math.min(1, i * 0.28 + 0.42)], outputRange: [0, 1], extrapolate: 'clamp' }),
                transform: [
                  {
                    translateY: ticks.interpolate({ inputRange: [i * 0.28, Math.min(1, i * 0.28 + 0.42)], outputRange: [8, 0], extrapolate: 'clamp' }),
                  },
                  { rotate: '45deg' },
                ],
              }}
            >
              <View style={[styles.tick, i === 2 && styles.tickLast]} />
            </Animated.View>
          ))}
        </Animated.View>

        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sheen,
              {
                opacity: sheen.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.9, 0] }),
                transform: [
                  {
                    translateX: sheen.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-46, 168],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        {stalled && !shouldDissolve ? (
          <View style={styles.escape}>
            <Text style={styles.escapeHint}>Opening is taking longer than usual.</Text>
            <View style={styles.escapeRow}>
              <PressableScale onPress={continueAnyway} haptic="medium" style={styles.escapeBtn}>
                <Text style={styles.escapePrimary}>Continue anyway</Text>
              </PressableScale>
              <PressableScale onPress={resetAndRestart} haptic="medium" scaleTo={0.96} style={styles.escapeBtnSecondary}>
                <Text style={[styles.escapeSecondary, confirmReset && { color: '#FFD9CC' }]}>
                  {confirmReset ? 'Tap again to reset app data' : 'Reset app data'}
                </Text>
              </PressableScale>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.footer} pointerEvents="none">
        <View style={styles.creditRow}>
          <View style={styles.creditDot} />
          <Text style={styles.credit}>MADE BY VIZTECH STUDIOS</Text>
          <View style={styles.creditDot} />
        </View>
        <Text style={styles.version}>v{APP_VERSION}</Text>
      </View>
    </Animated.View>
  );
}

const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

const styles = StyleSheet.create({
  orbWrap: { ...ABS_FILL, alignItems: 'center', justifyContent: 'center' },
  orbA: { position: 'absolute', top: '6%', right: '-12%', width: 440, height: 440, borderRadius: 220 },
  orbB: { position: 'absolute', bottom: '4%', left: '-14%', width: 400, height: 400, borderRadius: 200 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
  orbitFrame: { width: 236, height: 236, alignItems: 'center', justifyContent: 'center' },
  orbitRing: {
    ...ABS_FILL,
    borderRadius: 118,
    borderWidth: 1,
    borderColor: 'rgba(233,196,106,0.22)',
  },
  orbitSpin: { ...ABS_FILL },
  satelliteArm: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
  },
  satellite: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E9C46A',
    shadowColor: '#E9C46A',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  pane: {
    width: 156,
    height: 156,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#E9C46A',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: 'hidden',
  },
  logo: { width: 132, height: 132, borderRadius: 34 },
  title: { color: '#FFFFFF', fontFamily: font.displayBold, fontSize: 26, letterSpacing: 0.3, marginTop: 26, textAlign: 'center' },
  tagline: {
    color: 'rgba(233,196,106,0.85)',
    fontFamily: font.medium,
    fontSize: 13,
    letterSpacing: 0.4,
    marginTop: 7,
    textAlign: 'center',
  },
  tickRow: { flexDirection: 'row', gap: 16, marginTop: 18, alignItems: 'center' },
  tick: { width: 8, height: 8, borderRadius: 2.5, backgroundColor: 'rgba(233,196,106,0.45)' },
  tickLast: { backgroundColor: 'rgba(233,196,106,0.95)' },
  track: {
    marginTop: 26,
    width: 168,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 1.5, backgroundColor: '#E9C46A' },
  sheen: {
    ...ABS_FILL,
    width: 46,
    backgroundColor: 'rgba(255,244,214,0.55)',
  },
  escape: { marginTop: 26, alignItems: 'center' },
  escapeHint: { color: 'rgba(240,248,243,0.7)', fontFamily: font.medium, fontSize: 12, textAlign: 'center' },
  escapeRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 },
  escapeBtn: {
    backgroundColor: '#E9C46A',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  escapePrimary: { color: '#12301F', fontFamily: font.bold, fontSize: 12.5 },
  escapeBtnSecondary: { paddingVertical: 9, paddingHorizontal: 8 },
  escapeSecondary: { color: 'rgba(240,248,243,0.62)', fontFamily: font.medium, fontSize: 12, textDecorationLine: 'underline' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 44, alignItems: 'center' },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creditDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(233,196,106,0.6)' },
  credit: {
    color: 'rgba(242,227,196,0.92)',
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 2.4,
  },
  version: { color: 'rgba(233,196,106,0.5)', fontFamily: font.medium, fontSize: 10.5, letterSpacing: 0.8, marginTop: 8 },
});
