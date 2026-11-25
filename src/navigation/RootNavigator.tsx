import React, { Suspense } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandFern, font, gradientsFor, lightColors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { useUI } from '../store/UIContext';
import { PressableScale } from '../components/PressableScale';
import { HomeScreen } from '../screens/HomeScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { TasksScreen } from '../screens/TasksScreen';

// Heavy screens load on demand — keeps the first paint light on old devices.
const ScanScreen = React.lazy(() =>
  import('../screens/ScanScreen').then((m) => ({ default: m.ScanScreen }))
);
const AdvisorScreen = React.lazy(() =>
  import('../screens/AdvisorScreen').then((m) => ({ default: m.AdvisorScreen }))
);
const SettingsScreen = React.lazy(() =>
  import('../screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);

function suspend(Component: React.ComponentType<any>) {
  return (props: any) => (
    <Suspense fallback={<View style={StyleSheet.absoluteFill} />}>
      <Component {...props} />
    </Suspense>
  );
}

export type RootTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Scan: undefined;
  Advisor: undefined;
  Tasks: undefined;
  Settings: undefined;
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'wallet',
  Calendar: 'calendar',
  Tasks: 'flag',
};

/**
 * One tab slot: a compact icon plate with the label pinned beneath it. The
 * active tab tints its plate and carries a small gold mark — the accent
 * thread of the whole app. Every dimension is explicit and centered.
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
  return (
    <View style={styles.slot}>
      <PressableScale onPress={onPress} scaleTo={0.9} style={styles.slotPress} haptic={focused ? false : 'light'}>
        <View style={[styles.plate, focused && { backgroundColor: t.ice100 }]}>
          <Ionicons name={focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)} size={20} color={focused ? t.ocean600 : t.faint} />
          {focused ? <View style={[styles.plateMark, { backgroundColor: t.sun500 }]} /> : null}
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: focused ? t.text : t.faint }, focused && styles.labelOn]}>
          {label}
        </Text>
      </PressableScale>
    </View>
  );
}

/**
 * The bottom rail — three quiet slots (Goals · Calendar · [+ add] · Balance)
 * on a solid paper surface. The big green + lives in the rail itself, so no
 * floating button ever covers the page content. Anchored insets keep
 * everything clear of the home indicator on notched iPhones.
 */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t, isDark, shadow } = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 6);
  const gradients = gradientsFor(isDark);

  return (
    <View style={styles.railWrap} pointerEvents="box-none">
      <View
        style={[
          styles.rail,
          {
            backgroundColor: t.card,
            borderTopColor: t.line,
            paddingBottom: bottomInset,
          },
          isDark ? null : shadow.card,
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;
          if (!TAB_ICONS[route.name]) return null; // hidden routes: Scan, Advisor, Settings

          const icon = TAB_ICONS[route.name];
          const slot = (
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
          // after the second slot, lay the big green + button into the rail
          return index === 2
            ? [
                slot,
                <View key="add-slot" style={styles.slot}>
                  <PressableScale onPress={() => ui.openAdd()} scaleTo={0.88} haptic="medium" style={styles.slotPress}>
                    <LinearGradient
                      colors={gradients.fab}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.addBtn}
                    >
                      <Ionicons name="add" size={26} color={lightColors.white} />
                    </LinearGradient>
                  </PressableScale>
                </View>,
              ]
            : [slot];
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
      initialRouteName="Home"
    >
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Goals' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Balance' }} />
      <Tab.Screen name="Scan" component={suspend(ScanScreen)} options={{ title: 'Scan' }} />
      <Tab.Screen name="Advisor" component={suspend(AdvisorScreen)} options={{ title: 'Advisor' }} />
      <Tab.Screen name="Settings" component={suspend(SettingsScreen)} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const RAIL_HEIGHT = 62;

const styles = StyleSheet.create({
  railWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandFern,
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
  label: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 0.1,
  },
  labelOn: {
    fontFamily: font.bold,
  },
});
