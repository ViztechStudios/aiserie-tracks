import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { PressableScale } from './PressableScale';

/** Standalone copy — the recovery path must not depend on any app module. */
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
 * The last line of defence between a bug and a blank screen.
 *
 * Everything in the app renders inside this boundary. If any screen or
 * provider throws during render, the boundary swaps the whole tree for a
 * branded recovery card — Fern & Bark, the two buttons that always work:
 * "Try again" remounts the app in place; "Reset app data" clears Aiserie's
 * storage keys after a double-tap confirmation, for the rare case where a
 * damaged row keeps re-crashing boot. The raw error text sits in a tiny
 * footnote so a screenshot is enough to diagnose it.
 */
interface State {
  error: Error | null;
  attempt: number;
  confirmReset: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, attempt: 0, confirmReset: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // keep it observable in dev/native logs without any crash reporting service
    console.warn('[Aiserie] render error caught by boundary:', error.message, info.componentStack);
  }

  private retry = () => {
    this.setState((s) => ({ error: null, attempt: s.attempt + 1, confirmReset: false }));
  };

  private resetAppData = async () => {
    if (!this.state.confirmReset) {
      this.setState({ confirmReset: true });
      return;
    }
    try {
      const keys = (await AsyncStorage.getAllKeys()) as string[];
      const ours = keys.filter((k) => k.startsWith('aiserie.'));
      await AsyncStorage.multiRemove(ours.length ? ours : KNOWN_KEYS);
    } catch {
      // storage itself is broken — the best-effort fallback still helps
      try {
        await AsyncStorage.multiRemove(KNOWN_KEYS);
      } catch {
        /* nothing more we can do here */
      }
    }
    this.retry();
  };

  render() {
    if (!this.state.error) {
      return (
        <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>
      );
    }
    return <RecoveryScreen message={this.state.error.message} onRetry={this.retry} onReset={this.resetAppData} confirmReset={this.state.confirmReset} />;
  }
}

function RecoveryScreen({
  message,
  onRetry,
  onReset,
  confirmReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
  confirmReset: boolean;
}) {
  // native splash may still be up if the crash happened during boot
  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const lift = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(lift, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [lift]);

  const short = (message || '').split('\n')[0].slice(0, 160);

  return (
    <LinearGradient colors={['#05130C', '#0C2E1D', '#123E28']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1.15 }} style={styles.fill}>
      <Animated.View style={[styles.card, { opacity: lift, transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] }]}>
        <Image source={require('../../assets/mascot-duo.png')} style={styles.mascot} resizeMode="contain" />
        <Text style={styles.title}>Aiserie hit a snag</Text>
        <Text style={styles.sub}>
          Nothing was lost — your money notes stay on this device. Try opening the app again; if it keeps stumbling, a fresh
          start clears the damaged note that caused it.
        </Text>

        <PressableScale onPress={onRetry} haptic="medium" style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Try again</Text>
        </PressableScale>

        <PressableScale onPress={onReset} haptic="medium" scaleTo={0.96} style={[styles.resetBtn, confirmReset && { borderColor: '#E76F51', backgroundColor: 'rgba(231,111,81,0.14)' }]}>
          <Text style={[styles.resetText, confirmReset && { color: '#FFD9CC' }]}>
            {confirmReset ? 'Tap again to erase app data' : 'Reset app data'}
          </Text>
        </PressableScale>

        {short ? <Text style={styles.err} numberOfLines={2}>{short}</Text> : null}
        <Text style={styles.foot}>Made by Viztech Studios</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { alignItems: 'center', width: '100%', maxWidth: 360 },
  mascot: { width: 108, height: 84, marginBottom: 14 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  sub: { color: 'rgba(240,248,243,0.78)', fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 10, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: '#E9C46A', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 40, width: '100%',
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  primaryText: { color: '#12301F', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  resetBtn: {
    marginTop: 12, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  resetText: { color: 'rgba(240,248,243,0.85)', fontSize: 13.5, fontWeight: '600' },
  err: { color: 'rgba(233,196,106,0.55)', fontSize: 10, marginTop: 22, textAlign: 'center' },
  foot: { color: 'rgba(233,196,106,0.4)', fontSize: 10, letterSpacing: 1.6, marginTop: 10 },
});
