import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PressableScale } from './PressableScale';
import { useLock } from '../store/LockContext';
import { verifyPin } from '../utils/pinlock';
import { font, spacing } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * The optional 4-digit PIN gate. Rendered above everything when a lock is
 * configured and the app has not been unlocked yet — asks once per launch,
 * never stores the PIN, and stays friendly: the two companions greet you.
 */
export function AppLockGate() {
  const lock = useLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const active = lock.config?.enabled && !lock.unlocked;

  useEffect(() => {
    if (!active) {
      setPin('');
      setError(false);
    }
  }, [active]);

  if (!lock.config?.enabled || lock.unlocked) return null;

  const press = (k: string) => {
    if (k === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!k) return;
    if (pin.length >= 4) return;
    Haptics.selectionAsync?.().catch(() => {});
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      const cfg = lock.config;
      // verify against the stored salted hash
      const ok = cfg ? verifyPin(next, cfg) : false;
      setTimeout(() => {
        if (ok) {
          lock.unlock();
        } else {
          setError(true);
          Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Error).catch(() => {});
          Animated.sequence([
            Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
          ]).start(() => {
            setPin('');
            setTimeout(() => setError(false), 400);
          });
        }
      }, 90);
    }
  };

  return (
    <View style={styles.scrim}>
      <View style={styles.inner}>
        <View style={styles.mascotBubble}>
          <Image source={require('../../assets/mascot-wave.png')} style={styles.mascot} resizeMode="contain" />
        </View>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>Aiserie is locked</Text>
        <Text style={[styles.sub, { color: 'rgba(240,248,243,0.75)' }]}>Enter your 4-digit PIN to continue</Text>
        <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { borderColor: 'rgba(255,255,255,0.55)', backgroundColor: i < pin.length ? '#F0D492' : 'transparent' },
              ]}
            />
          ))}
        </Animated.View>
        {error ? <Text style={styles.errorText}>That pin did not match — try again.</Text> : null}
        <View style={styles.pad}>
          {KEYS.map((k, i) =>
            k === '' ? (
              <View key={i} style={styles.keyBlank} />
            ) : k === 'del' ? (
              <PressableScale key={i} onPress={() => press(k)} scaleTo={0.9} style={styles.keyRound}>
                <Text style={[styles.keyDel, { color: 'rgba(240,248,243,0.8)' }]}>⌫</Text>
              </PressableScale>
            ) : (
              <PressableScale key={i} onPress={() => press(k)} scaleTo={0.9} style={styles.keyRound}>
                <Text style={[styles.keyText, { color: '#FFFFFF' }]}>{k}</Text>
              </PressableScale>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0E3B29', alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', width: '100%', paddingHorizontal: spacing.xl },
  mascotBubble: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  mascot: { width: 62, height: 62, marginTop: 4 },
  title: { fontFamily: font.display, fontSize: 21, marginTop: spacing.lg },
  sub: { fontFamily: font.medium, fontSize: 13, marginTop: 6 },
  dots: { flexDirection: 'row', gap: 16, marginTop: spacing.lg },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  errorText: { fontFamily: font.medium, fontSize: 12, color: '#FFC9CD', marginTop: spacing.md },
  pad: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14,
    marginTop: spacing.lg, maxWidth: 260,
  },
  keyBlank: { width: 68, height: 62 },
  keyRound: {
    width: 68, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  keyText: { fontFamily: font.heavy, fontSize: 22 },
  keyDel: { fontSize: 18 },
});
