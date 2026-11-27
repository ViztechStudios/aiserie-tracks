import React, { Suspense, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandFern, font, gradientsFor, lightColors } from '../theme';
import { useTheme } from '../store/ThemeContext';
import { useUI } from '../store/UIContext';
import { PressableScale } from '../components/PressableScale';
import { HomeScreen } from '../screens/HomeScreen';
import { WalletsScreen } from '../screens/WalletsScreen';

// Heavy screens load on demand — keeps the first paint light on old devices.
const InsightsScreen = React.lazy(() =>
  import('../screens/InsightsScreen').then((m) => ({ default: m.InsightsScreen }))
);
const FinanceScreen = React.lazy(() =>
  import('../screens/FinanceScreen').then((m) => ({ default: m.FinanceScreen }))
);
const ScanScreen = React.lazy(() =>
  import('../screens/ScanScreen').then((m) => ({ default: m.ScanScreen }))
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
  Wallets: undefined;
  Scan: undefined;
  Insights: undefined;
  Finance: undefined;
  Settings: undefined;
};

/** Height of the rail body (before the bottom safe-area inset is added). */
export const RAIL_BASE_HEIGHT = 62;
/** Total bottom coverage of the tab rail: body + the device's bottom inset.
 *  Screens and floating controls use this to stay clear of the rail. */
export function railTotalHeight(bottomInset: number): number {
  return RAIL_BASE_HEIGHT + bottomInset;
}

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'paw',
  Wallets: 'wallet',
  Insights: 'stats-chart',
  Finance: 'leaf',
};

/**
 * One tab slot — v4.3.0 showroom rail: a quiet uppercase wordmark, the way
 * the site mockups draw navigation. The active tab turns mint-teal and a
 * small dot springs in beneath it; nothing else competes for attention.
 */
function TabSlot({
  routeKey,
  label,
  focused,
  onPress,
}: {
  routeKey: string;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  // the active dot fades in softly (v4.4.0: a calm fade, no spring pop) —
  // opacity + scale on one value, one native driver
  const dot = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    try {
      Animated.timing(dot, {
        toValue: focused ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true, // transform + opacity only
      }).start();
    } catch {
      /* a tab dot can never take the app down */
    }
  }, [focused, dot]);
  return (
    <View style={styles.slot}>
      <PressableScale
        onPress={onPress}
        scaleTo={0.94}
        style={styles.slotPress}
        haptic={focused ? false : 'light'}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
      >
        <Text
          numberOfLines={1}
          style={[styles.label, { color: focused ? t.ocean600 : t.faint }, focused && styles.labelOn]}
        >
          {label.toUpperCase()}
        </Text>
        {focused ? (
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: t.ocean600, opacity: dot, transform: [{ scale: dot }] },
            ]}
          />
        ) : null}
      </PressableScale>
    </View>
  );
}

/**
 * The bottom rail — HOME · WALLETS · [+ add] · REPORTS · FINANCE — a frosted
 * strip floating on the aurora. Labels only, like the site mockups; the big
 * green + lives in the rail itself, so no floating button ever covers the
 * page content. Anchored insets keep everything clear of the home indicator
 * on notched iPhones.
 */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t, isDark, shadow } = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 6);
  const gradients = gradientsFor(isDark);
  // v4.3.0: the rail now floats over the aurora with page content scrolling
  // beneath it — a near-transparent glass fill let the ledger read straight
  // through the tab labels (the "overlapping tabs" report). The fill is a
  // solid ink of the canvas so nothing ever ghosts through the labels; the
  // hairline + shadow still read as a pane.
  const railFill = isDark ? '#0A1F15' : '#F6FBF7';

  return (
    <View style={styles.railWrap} pointerEvents="box-none">
      <View
        style={[
          styles.rail,
          {
            backgroundColor: railFill,
            borderTopColor: t.line,
            // additive: body height + safe-area inset (see styles.rail note)
            height: railTotalHeight(bottomInset),
            paddingBottom: bottomInset,
          },
          shadow.card,
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;
          if (!TAB_ICONS[route.name]) return null; // hidden routes: Scan, Settings

          const icon = TAB_ICONS[route.name];
          const slot = (
            <TabSlot
              key={route.key}
              routeKey={route.key}
              label={label}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            />
          );
          // after the second slot (Wallets), lay the big green + into the rail
          return index === 1
            ? [
                slot,
                <View key="add-slot" style={styles.slot}>
                  <PressableScale
                    onPress={() => ui.openAdd()}
                    scaleTo={0.88}
                    haptic="medium"
                    style={styles.slotPress}
                    accessibilityRole="button"
                    accessibilityLabel="Add a transaction"
                  >
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Wallets" component={WalletsScreen} options={{ title: 'Wallets' }} />
      <Tab.Screen name="Insights" component={suspend(InsightsScreen)} options={{ title: 'Reports' }} />
      <Tab.Screen name="Finance" component={suspend(FinanceScreen)} options={{ title: 'Finance' }} />
      <Tab.Screen name="Scan" component={suspend(ScanScreen)} options={{ title: 'Scan' }} />
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
    // v4.2.0: the bottom safe-area inset is ADDED to the rail height instead
    // of being carved out of it — on notched iPhones the old fixed 62pt left
    // only ~28pt for a ~44pt tab slot, so icon plates poked over the rail's
    // top edge and labels sat in the home-indicator zone.
    height: RAIL_HEIGHT,
    minHeight: RAIL_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slot: { flex: 1, justifyContent: 'center' },
  slotPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 6,
  },
  dot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  labelOn: {
    fontFamily: font.bold,
    letterSpacing: 1.8,
  },
});
