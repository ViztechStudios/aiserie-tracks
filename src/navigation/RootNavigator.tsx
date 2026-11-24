import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { AdvisorScreen } from '../screens/AdvisorScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, gradients, shadow, spacing } from '../theme';

export type RootTabParamList = {
  Home: undefined;
  History: undefined;
  Scan: undefined;
  Advisor: undefined;
  Settings: undefined;
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  History: 'receipt-outline',
  Advisor: 'sparkles',
  Settings: 'settings-outline',
};

/** White tab bar with a raised ocean-gradient FAB in the middle (Scan). */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.barWrap}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;

          if (route.name === 'Scan') {
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.fabSlot}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(route.name)}
              >
                <LinearGradient
                  colors={gradients.fab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.fab, shadow.fab]}
                >
                  <Ionicons name="camera" size={24} color={colors.white} />
                </LinearGradient>
                <Text style={styles.fabLabel}>Scan</Text>
              </TouchableOpacity>
            );
          }

          const icon = TAB_ICONS[route.name] ?? 'ellipse-outline';
          const filled = icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
            >
              <Ionicons
                name={focused ? filled : icon}
                size={22}
                color={focused ? colors.ocean600 : colors.faint}
              />
              <Text style={[styles.tabLabel, focused && { color: colors.ocean600, fontWeight: '800' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name="Advisor" component={AdvisorScreen} options={{ title: 'Advisor' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const BAR_HEIGHT = 62 + (Platform.OS === 'ios' ? 22 : 10);

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    height: BAR_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { color: colors.faint, fontSize: 10.5, fontWeight: '600' },
  fabSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: BAR_HEIGHT },
  fab: {
    position: 'absolute',
    top: -26,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.card,
  },
  fabLabel: { color: colors.faint, fontSize: 10.5, fontWeight: '700', marginTop: 34 },
});
