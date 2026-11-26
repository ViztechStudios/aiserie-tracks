import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { font } from '../theme';

const BOOT_BG: readonly [string, string, string] = ['#05130C', '#0C2E1D', '#123E28'];

interface Props {
  /** Data hydration flag — the curtain dissolves once ready AND the intro has played. */
  ready: boolean;
  onDone: () => void;
}

const INTRO_MIN_MS = 2200;
const APP_VERSION = Constants.expoConfig?.version ?? '';

/**
 * Official boot experience: native splash hands off to this animated curtain
 * — badge rises on a gold plate, wordmark settles, a quiet sheen crosses the
 * progress track — then dissolves into the app.
 */
export function LoadingScreen({ ready, onDone }: Props) {
  const [mount, setMount] = React.useState(true);
  const [introDone, setIntroDone] = React.useState(false);
  const logo = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 640, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.timing(word, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tag, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(bar, { toValue: 0.94, duration: 1900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(sheen, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    const timer = setTimeout(() => setIntroDone(true), INTRO_MIN_MS);
    return () => clearTimeout(timer);
  }, [logo, word, tag, float, breathe, bar, sheen]);

  const shouldDissolve = ready && introDone;

  useEffect(() => {
    if (!shouldDissolve || mount === false) return;
    Animated.parallel([
      Animated.timing(out, { toValue: 0, duration: 460, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(bar, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start(() => {
      setMount(false);
      SplashScreen.hideAsync().catch(() => {});
      onDone();
    });
  }, [shouldDissolve, mount, out, bar, onDone]);

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
      {/* soft glow behind the badge */}
      <View style={styles.glowWrap} pointerEvents="none">
        <View style={styles.glow} />
      </View>
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logo,
            transform: [
              { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
              { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
              {
                scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={['rgba(233,196,106,0.26)', 'rgba(233,196,106,0.05)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.halo}
          >
            <Animated.Image
              source={require('../../assets/splash-icon.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <Text style={styles.title}>Aiserie Tracks</Text>
        </Animated.View>
        <Animated.View style={{ opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <Text style={styles.tagline}>Your money, beautifully tracked</Text>
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
  glowWrap: { ...ABS_FILL, alignItems: 'center', justifyContent: 'center' },
  glow: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(233,196,106,0.10)',
    transform: [{ scaleY: 0.82 }],
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
  halo: {
    width: 152,
    height: 152,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233,196,106,0.36)',
    shadowColor: '#E9C46A',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logo: { width: 124, height: 124, borderRadius: 30, overflow: 'hidden' },
  title: { color: '#FFFFFF', fontFamily: font.displayBold, fontSize: 26, letterSpacing: 0.3, marginTop: 26, textAlign: 'center' },
  tagline: {
    color: 'rgba(233,196,106,0.85)',
    fontFamily: font.medium,
    fontSize: 13,
    letterSpacing: 0.4,
    marginTop: 7,
    textAlign: 'center',
  },
  track: {
    marginTop: 34,
    width: 168,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(233,196,106,0.16)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 1.5, backgroundColor: '#E9C46A' },
  sheen: {
    ...ABS_FILL,
    width: 46,
    backgroundColor: 'rgba(255,244,214,0.55)',
  },
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
