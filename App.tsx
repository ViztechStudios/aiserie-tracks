import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { FinanceProvider, useFinance } from './src/store/FinanceContext';
import { TasksProvider } from './src/store/TasksContext';
import { UIProvider, useUI } from './src/store/UIContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TransactionModal } from './src/components/TransactionModal';
import { WalletsModal } from './src/components/WalletsModal';
import { LegalModal } from './src/components/LegalModal';
import { UpdateModal } from './src/components/UpdateModal';
import { LoadingScreen } from './src/components/LoadingScreen';
import { checkForUpdate } from './src/services/updateCheck';

// keep the native splash visible until the animated curtain is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const BOOT_MIN_MS = 2100; // curtain always plays at least this long

function Shell() {
  const finance = useFinance();
  const { t } = useTheme();
  const ui = useUI();
  const [booting, setBooting] = useState(true);
  const startedAt = useRef(Date.now());
  const updateChecked = useRef(false);

  // keep the native splash hidden behind our curtain while booting
  useEffect(() => {
    if (booting) SplashScreen.preventAutoHideAsync().catch(() => {});
  }, [booting]);

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        ...DarkTheme.colors,
        background: t.bg,
        primary: t.ocean600,
        card: t.cardSolid,
        text: t.text,
        border: t.line,
        notification: t.aqua400,
      },
      fonts: DefaultTheme.fonts,
    }),
    [t]
  );

  // once data is hydrated and the curtain has had its moment, start the update check
  useEffect(() => {
    if (!finance.ready || updateChecked.current) return;
    updateChecked.current = true;
    const wait = Math.max(0, BOOT_MIN_MS - (Date.now() - startedAt.current)) + 900;
    const timer = setTimeout(() => {
      checkForUpdate().then((info) => {
        if (info) ui.showUpdate(info);
      });
    }, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finance.ready]);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <RootNavigator />
      <TransactionModal />
      <WalletsModal />
      <LegalModal />
      <UpdateModal />
      <LoadingScreen ready={finance.ready} onDone={() => setBooting(false)} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FinanceProvider>
            <TasksProvider>
              <UIProvider>
                <Shell />
              </UIProvider>
            </TasksProvider>
          </FinanceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
