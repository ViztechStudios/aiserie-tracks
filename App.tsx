import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { FinanceProvider } from './src/store/FinanceContext';
import { UIProvider } from './src/store/UIContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TransactionModal } from './src/components/TransactionModal';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...DarkTheme.colors,
    background: colors.bg,
    primary: colors.ocean600,
    card: colors.card,
    text: colors.text,
    border: colors.line,
    notification: colors.aqua400,
  },
  fonts: DefaultTheme.fonts,
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FinanceProvider>
          <UIProvider>
            <NavigationContainer theme={navTheme}>
              <StatusBar style="light" />
              <RootNavigator />
              <TransactionModal />
            </NavigationContainer>
          </UIProvider>
        </FinanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
