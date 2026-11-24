import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { darkColors, font, lightColors, mix, spacing } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { PressableScale } from '../components/PressableScale';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { AdvisorScreen } from '../screens/AdvisorScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

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
  const { t } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      speed: 30,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  const filled = name.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={focused ? filled : name} size={size} color={focused ? t.ocean600 : t.faint} />
    </Animated.View>
  );
}

/** Soft halo behind the FAB — a warm sunset ring over the ocean glass. */
function FabGlow() {
  const { progress } = useTheme();
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
          backgroundColor: mix(progress, 'rgba(246,194,115,0.5)', 'rgba(242,169,59,0.34)'),
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.12] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
        },
      ]}
    />
  );
}

/** One regular tab slot: capiz-tinted active pill + springy icon + uppercase label. */
function TabSlot({
  routeKey,
  icon,
  label,
  focused,
  onPress,
}: {
  routeKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const { progress, t, isDark } = useTheme();
  const pill = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(pill, { toValue: focused ? 1 : 0, speed: 28, bounciness: 6, useNativeDriver: true }).start();
  }, [focused, pill]);

  return (
    <View key={routeKey} style={styles.slotWrap}>
      <PressableScale style={styles.tab} scaleTo={0.9} onPress={onPress}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabPill,
            {
              opacity: pill.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              backgroundColor: mix(progress, 'rgba(14,165,233,0.13)', 'rgba(56,189,248,0.20)'),
              transform: [{ scale: pill.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
            },
          ]}
        />
        <TabIcon name={icon} focused={focused} size={21} />
        <Animated.Text
          style={[
            styles.tabLabel,
            { color: focused ? t.ocean600 : mix(progress, lightColors.faint, darkColors.faint) },
            focused && { fontWeight: '800' },
          ]}
        >
          {label}
        </Animated.Text>
      </PressableScale>
    </View>
  );
}

/** Floating frosted-glass tab bar with a raised ocean-gradient FAB in the middle (Scan). */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { progress, isDark, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const tintBg = mix(progress, 'rgba(255,255,255,0.40)', 'rgba(10,26,48,0.52)');
  const borderColor = mix(progress, lightColors.glassBorder, darkColors.glassBorder);
  const bottomPad = Math.max(Platform.OS === 'ios' ? 10 : 12, insets.bottom + 6);

  return (
    <View style={[styles.barWrap, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <Animated.View style={[styles.barShell, { borderColor }, shadow.cardHi]}>
        <View style={styles.blurWrap} pointerEvents="none">
          <BlurView
            intensity={44}
            tint={isDark ? 'dark' : 'light'}
            experimentalBlurMethod={Platform.OS === 'web' ? undefined : 'dimezisBlurView'}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[StyleSheet.absoluteFill, tintBg]} />
        </View>
        <View style={styles.bar}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = descriptors[route.key].options.title ?? route.name;

            if (route.name === 'Scan') {
              return (
                <View key={route.key} style={styles.slotWrap}>
                  <PressableScale
                    style={styles.fabSlot}
                    onPress={() => navigation.navigate(route.name)}
                    scaleTo={0.9}
                    haptic="medium"
                  >
                    <FabGlow />
                    <LinearGradient
                      colors={isDark ? ['#0C4A6E', '#0EA5E9', '#7DD3FC'] : ['#072F52', '#0EA5E9', '#67E8F9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.fab, { borderColor: isDark ? 'rgba(10,30,55,0.92)' : 'rgba(255,255,255,0.94)' }, shadow.fab]}
                    >
                      <Ionicons name="camera" size={24} color={lightColors.white} />
                    </LinearGradient>
                    <Animated.Text style={[styles.fabLabel, { color: mix(progress, lightColors.faint, darkColors.faint) }]}>
                      Scan
                    </Animated.Text>
                  </PressableScale>
                </View>
              );
            }

            const icon = TAB_ICONS[route.name] ?? 'ellipse-outline';
            return (
              <TabSlot
                key={route.key}
                routeKey={route.key}
                icon={icon}
                label={label}
                focused={focused}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
              />
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  const { t } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // opaque so a not-yet-hidden previous tab never bleeds through
        sceneStyle: { backgroundColor: t.bg },
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
const BAR_HEIGHT = 62;
const ABS_FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  barShell: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2 + 3,
    borderWidth: 1,
  },
  blurWrap: {
    ...ABS_FILL,
    borderRadius: BAR_HEIGHT / 2 + 3,
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotWrap: { flex: 1, alignSelf: 'stretch' },
  tab: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabPill: {
    position: 'absolute',
    top: BAR_HEIGHT / 2 - 26,
    width: 44,
    height: 28,
    borderRadius: 14,
  },
  tabLabel: {
    fontFamily: font.bold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fabSlot: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end', height: BAR_HEIGHT },
  fabGlow: {
    position: 'absolute',
    top: -26,
    width: 62,
    height: 62,
    borderRadius: 31,
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
  },
  fabLabel: {
    fontFamily: font.bold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 34,
  },
});
