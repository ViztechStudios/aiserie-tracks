import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { FinanceProvider } from './src/store/FinanceContext';
import { TasksProvider } from './src/store/TasksContext';
import { UIProvider } from './src/store/UIContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TransactionModal } from './src/components/TransactionModal';
import { WalletsModal } from './src/components/WalletsModal';
import { LegalModal } from './src/components/LegalModal';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...DarkTheme.colors,
    background: colors.bg,
    primary: colors.ocean600,
    card: colors.cardSolid,
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
          <TasksProvider>
            <UIProvider>
            <NavigationContainer theme={navTheme}>
              <StatusBar style="light" />
              <RootNavigator />
              <TransactionModal />
              <WalletsModal />
              <LegalModal />
            </NavigationContainer>
            </UIProvider>
          </TasksProvider>
        </FinanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
