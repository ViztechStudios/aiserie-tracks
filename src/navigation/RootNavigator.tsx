import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../components/PressableScale';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { AdvisorScreen } from '../screens/AdvisorScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, gradients, shadow, spacing } from '../theme';

export type RootTabParamList = {
  Home: undefined;
  History: undefined;
  Scan: undefined;
  Advisor: undefined;
  Tasks: undefined;
  Settings: undefined;
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  History: 'receipt-outline',
  Advisor: 'sparkles',
  Tasks: 'checkmark-done-outline',
  Settings: 'settings-outline',
};

/** Tab icon that springs up when it becomes active. */
function TabIcon({ name, focused, size }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.14 : 1,
      speed: 30,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  const filled = name.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={focused ? filled : name} size={size} color={focused ? colors.ocean600 : colors.faint} />
    </Animated.View>
  );
}

/** Soft halo behind the FAB that breathes on a slow loop. */
function FabGlow() {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fabGlow,
        {
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.1] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
        },
      ]}
    />
  );
}

/** Floating frosted-glass tab bar with a raised ocean-gradient FAB in the middle (Scan). */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const supportsBlur = Platform.OS === 'ios' || Platform.OS === 'android';
  return (
    <View style={styles.barWrap} pointerEvents="box-none">
      <View style={styles.barShell}>
        <View style={styles.blurWrap} pointerEvents="none">
          {supportsBlur ? (
            <BlurView
              intensity={46}
              tint="light"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={[styles.barTint, !supportsBlur && styles.barFallback]} />
        </View>
        <View style={styles.bar}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = descriptors[route.key].options.title ?? route.name;

            if (route.name === 'Scan') {
              return (
                <PressableScale
                  key={route.key}
                  style={styles.fabSlot}
                  onPress={() => navigation.navigate(route.name)}
                  scaleTo={0.9}
                  haptic="medium"
                >
                  <FabGlow />
                  <LinearGradient
                    colors={gradients.fab}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.fab, shadow.fab]}
                  >
                    <Ionicons name="camera" size={24} color={colors.white} />
                  </LinearGradient>
                  <Text style={styles.fabLabel}>Scan</Text>
                </PressableScale>
              );
            }

            const icon = TAB_ICONS[route.name] ?? 'ellipse-outline';
            return (
              <PressableScale
                key={route.key}
                style={styles.tab}
                scaleTo={0.9}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
              >
                <TabIcon name={icon} focused={focused} size={22} />
                <Text style={[styles.tabLabel, focused && { color: colors.ocean600, fontWeight: '800' }]}>
                  {label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name="Advisor" component={AdvisorScreen} options={{ title: 'Advisor' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

/** Floating pill: bar height + the gap it floats above the screen edge. */
const BAR_HEIGHT = 64;
const BAR_FLOAT = Platform.OS === 'ios' ? 18 : 14;
const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: BAR_FLOAT,
    backgroundColor: 'transparent',
  },
  barShell: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2 + 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.cardHi,
  },
  blurWrap: {
    ...ABS_FILL,
    borderRadius: BAR_HEIGHT / 2 + 4,
    overflow: 'hidden',
  },
  barTint: { ...ABS_FILL, backgroundColor: 'rgba(255,255,255,0.66)' },
  barFallback: { backgroundColor: 'rgba(255,255,255,0.92)' },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { color: colors.faint, fontSize: 10, fontWeight: '600' },
  fabSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: BAR_HEIGHT },
  fabGlow: {
    position: 'absolute',
    top: -26,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(14,165,233,0.55)',
  },
  fab: {
    position: 'absolute',
    top: -26,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  fabLabel: { color: colors.faint, fontSize: 10, fontWeight: '700', marginTop: 34 },
});
