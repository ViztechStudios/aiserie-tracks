import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { font, lightColors } from '../theme';
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

/**
 * One tab slot: a compact icon plate with the label pinned beneath it.
 * The active tab tints its plate with the brand blue and carries a small
 * gold mark — the same accent that threads through the rest of the app.
 * Every dimension here is explicit and centered, so the rail renders
 * identically on Android, iOS and web.
 */
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
  const { t } = useTheme();
  const filled = icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
  return (
    <View style={styles.slot}>
      <PressableScale onPress={onPress} scaleTo={0.9} style={styles.slotPress} haptic={focused ? false : 'light'}>
        <View
          style={[
            styles.plate,
            focused && { backgroundColor: t.ice100 },
          ]}
        >
          <Ionicons
            name={focused ? filled : icon}
            size={20}
            color={focused ? t.ocean600 : t.faint}
          />
          {focused ? <View style={[styles.plateMark, { backgroundColor: t.sun500 }]} /> : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: focused ? t.text : t.faint },
            focused && styles.labelOn,
          ]}
        >
          {label}
        </Text>
      </PressableScale>
    </View>
  );
}

/**
 * The bottom rail: a solid paper surface anchored to the edge, one hairline
 * across the top, and the Scan action living inside the rhythm of the bar
 * as a compact ink disc. No floating hardware, no blur, no glow — the
 * structure does the work.
 */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t, isDark, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.railWrap} pointerEvents="box-none">
      <View
        style={[
          styles.rail,
          {
            backgroundColor: t.card,
            borderTopColor: t.line,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 6),
          },
          isDark ? null : shadow.card,
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;

          if (route.name === 'Scan') {
            return (
              <View key={route.key} style={styles.slot}>
                <PressableScale
                  style={styles.slotPress}
                  onPress={() => navigation.navigate(route.name)}
                  scaleTo={0.9}
                  haptic="medium"
                >
                  <View
                    style={[
                      styles.scanDisc,
                      { backgroundColor: isDark ? t.sun500 : lightColors.ocean900 },
                    ]}
                  >
                    <Ionicons name="camera" size={16} color={isDark ? lightColors.bg : lightColors.white} />
                  </View>
                  <Text numberOfLines={1} style={[styles.label, { color: focused ? t.text : t.faint }]}>
                    {label}
                  </Text>
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

const RAIL_HEIGHT = 58;

const styles = StyleSheet.create({
  railWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  rail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: RAIL_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slot: { flex: 1, justifyContent: 'center' },
  slotPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 4,
  },
  plate: {
    width: 34,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateMark: {
    position: 'absolute',
    top: -3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  scanDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C2E44',
  },
  label: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  labelOn: {
    fontFamily: font.bold,
  },
});
