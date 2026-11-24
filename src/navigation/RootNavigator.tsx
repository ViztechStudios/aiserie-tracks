import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { darkColors, font, gradientsDark, gradientsLight, lightColors, mix } from '../theme';
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
  Advisor: 'compass',
  Tasks: 'checkmark-done-outline',
  Settings: 'settings-outline',
};

/** Tab icon that springs up when it becomes active. */
function TabIcon({ name, focused, size }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; size: number }) {
  const { t } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.08 : 1,
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

/**
 * A tiny eight-ray sun — the system's active-tab mark. It rises into place
 * when a tab is focused: quiet, warm, and unmistakably ours.
 */
function SunMark({ visible }: { visible: boolean }) {
  const { isDark } = useTheme();
  const rise = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(rise, {
      toValue: visible ? 1 : 0,
      speed: 30,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }, [visible, rise]);

  const core = isDark ? darkColors.sun500 : lightColors.sun500;
  const ray = isDark ? 'rgba(224,164,78,0.75)' : 'rgba(201,138,44,0.75)';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sunWrap,
        {
          opacity: rise,
          transform: [{ scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        },
      ]}
    >
      <View style={[styles.ray, styles.rayN, { backgroundColor: ray }]} />
      <View style={[styles.ray, styles.rayS, { backgroundColor: ray }]} />
      <View style={[styles.ray, styles.rayW, { backgroundColor: ray }]} />
      <View style={[styles.ray, styles.rayE, { backgroundColor: ray }]} />
      <View style={[styles.sunCore, { backgroundColor: core }]} />
    </Animated.View>
  );
}

/** One regular tab slot: icon + rising sun mark + label. */
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
  const { progress, t } = useTheme();
  return (
    <View key={routeKey} style={styles.slotWrap}>
      <PressableScale style={styles.tab} scaleTo={0.88} onPress={onPress}>
        <SunMark visible={focused} />
        <TabIcon name={icon} focused={focused} size={21} />
        <Animated.Text
          style={[
            styles.tabLabel,
            { color: focused ? t.text : mix(progress, lightColors.faint, darkColors.faint) },
            focused ? styles.tabLabelOn : null,
          ]}
        >
          {label}
        </Animated.Text>
      </PressableScale>
    </View>
  );
}

/**
 * Bottom bar — solid, structured, honest. Full width, anchored to the edge,
 * one hairline across the top, and the Scan action sitting inside the rhythm
 * of the bar instead of floating above it. No blur, no pill, no glow.
 */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { progress, isDark, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const barBg = mix(progress, lightColors.card, '#0E1E2E');
  const borderColor = mix(progress, lightColors.line, darkColors.line);
  const ringColor = mix(progress, lightColors.card, '#0E1E2E');

  return (
    <View style={styles.barWrap} pointerEvents="box-none">
      <Animated.View style={[styles.barShell, { backgroundColor: barBg, borderTopColor: borderColor }]}>
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
                    <Animated.View style={[styles.fabRing, { backgroundColor: ringColor }]}>
                      <Animated.View style={[styles.fab, shadow.fab]}>
                        <LinearGradient
                          colors={isDark ? [gradientsDark.fab[0], gradientsDark.fab[2]] : [gradientsLight.fab[0], gradientsLight.fab[2]]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="camera" size={21} color={lightColors.white} />
                      </Animated.View>
                    </Animated.View>
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
      {/* extends the bar surface under the home indicator / gesture area */}
      <Animated.View style={[styles.safeAreaExtend, { backgroundColor: barBg, height: Math.max(insets.bottom, 8) }]} />
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

const BAR_HEIGHT = 60;

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  barShell: {
    height: BAR_HEIGHT,
    borderTopWidth: 1,
  },
  safeAreaExtend: {},
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 6,
  },
  slotWrap: { flex: 1 },
  tab: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  sunWrap: {
    height: 10,
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunCore: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ray: {
    position: 'absolute',
    borderRadius: 1,
  },
  rayN: { width: 1.5, height: 3, top: -1 },
  rayS: { width: 1.5, height: 3, bottom: -1 },
  rayW: { width: 3, height: 1.5, left: -1 },
  rayE: { width: 3, height: 1.5, right: -1 },
  tabLabel: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  tabLabelOn: {
    fontFamily: font.bold,
  },
  fabSlot: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
