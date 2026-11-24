import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';

const BOOT_BG: readonly [string, string, string] = ['#04101F', '#0A2A4A', '#0E3A5F'];

interface Props {
  /** Data hydration flag — the curtain dissolves once ready AND the intro has played. */
  ready: boolean;
  onDone: () => void;
}

const INTRO_MIN_MS = 2100;

/**
 * Official boot experience: native splash hands off to this animated curtain
 * — glowing wave, wordmark, progress shimmer and the Viztech Studios credit —
 * then dissolves into the app.
 */
export function LoadingScreen({ ready, onDone }: Props) {
  const [mount, setMount] = React.useState(true);
  const [introDone, setIntroDone] = React.useState(false);
  const logo = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 620, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.timing(word, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(bar, { toValue: 0.94, duration: 1750, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const timer = setTimeout(() => setIntroDone(true), INTRO_MIN_MS);
    return () => clearTimeout(timer);
  }, [logo, word, float, bar]);

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
      {/* soft glow behind the wave */}
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
            ],
          }}
        >
          <LinearGradient
            colors={['rgba(56,189,248,0.45)', 'rgba(103,232,249,0.10)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.halo}
          >
            <Animated.Image
              source={require('../../assets/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <Text style={styles.title}>Aiserie Tracks</Text>
          <Text style={styles.tagline}>Your money, beautifully tracked</Text>
        </Animated.View>

        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
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
        <Text style={styles.version}>v2.0.0 · Ocean Glass</Text>
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
    backgroundColor: 'rgba(14,165,233,0.16)',
    transform: [{ scaleY: 0.82 }],
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
  halo: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.28)',
  },
  logo: { width: 96, height: 96 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', letterSpacing: 0.6, marginTop: 26, textAlign: 'center' },
  tagline: { color: 'rgba(186,230,253,0.85)', fontSize: 13, letterSpacing: 0.4, marginTop: 7, textAlign: 'center' },
  track: {
    marginTop: 34,
    width: 168,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(125,211,252,0.18)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: '#7DD3FC' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 44, alignItems: 'center' },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creditDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(125,211,252,0.55)' },
  credit: { color: 'rgba(224,242,254,0.92)', fontSize: 11, fontWeight: '800', letterSpacing: 2.4 },
  version: { color: 'rgba(125,191,251,0.55)', fontSize: 10.5, letterSpacing: 0.8, marginTop: 8 },
});
