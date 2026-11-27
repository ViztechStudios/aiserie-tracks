import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import { FinanceProvider, useFinance } from './src/store/FinanceContext';
import { TasksProvider } from './src/store/TasksContext';
import { BudgetsProvider } from './src/store/BudgetsContext';
import { BillsProvider } from './src/store/BillsContext';
import { RecurringProvider } from './src/store/RecurringContext';
import { GoalsProvider } from './src/store/GoalsContext';
import { LockProvider } from './src/store/LockContext';
import { UIProvider, useUI } from './src/store/UIContext';
import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TransactionModal } from './src/components/TransactionModal';
import { WalletsModal } from './src/components/WalletsModal';
import { LegalModal } from './src/components/LegalModal';
import { UpdateModal } from './src/components/UpdateModal';
import { ReportsModal } from './src/components/ReportsModal';
import { BackupRestoreModal } from './src/components/BackupRestoreModal';
import { BudgetAlertsHost } from './src/components/BudgetAlertsHost';
import { AppLockGate } from './src/components/AppLockGate';
import { PrivacyShield } from './src/components/PrivacyShield';
import { ConfirmSheet } from './src/components/ConfirmSheet';
import { ToastHost } from './src/components/ToastHost';
import { LoadingScreen } from './src/components/LoadingScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { installStorageFlushHooks } from './src/store/storage';
import { checkForUpdate } from './src/services/updateCheck';

// keep the native splash visible until the animated curtain is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const BOOT_MIN_MS = 1500; // curtain minimum — trimmed in v4.2.0: the Orbit &
// Frost moment still plays (intro enforces its own 1.5s), but the enforced
// boot no longer doubles it; data-ready launches now land ~1.2s sooner

/**
 * On the web (iOS standalone PWA), react-native-safe-area-context reports
 * zero insets — so notched iPhones let the header run under the status bar
 * and the bottom rail under the home indicator. Measure the real CSS env()
 * values once at boot and hand them to the provider.
 */
function webInitialMetrics(): Metrics | undefined {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
  try {
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
    const cs = window.getComputedStyle(probe);
    const insets = {
      top: parseInt(cs.paddingTop, 10) || 0,
      right: parseInt(cs.paddingRight, 10) || 0,
      bottom: parseInt(cs.paddingBottom, 10) || 0,
      left: parseInt(cs.paddingLeft, 10) || 0,
    };
    document.body.removeChild(probe);
    return {
      insets,
      frame: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
    };
  } catch {
    return undefined;
  }
}

function Shell() {
  const finance = useFinance();
  // one-time: flush queued storage writes when the app leaves the foreground
  useEffect(() => {
    installStorageFlushHooks();
  }, []);
  const { t, isDark } = useTheme();
  const ui = useUI();
  const [fontsLoaded] = useFonts({ Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold, Lora_600SemiBold, Lora_700Bold });
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
      {/* v4.3.0: headers are now transparent veils on the aurora, so the
          status bar ink must follow the scheme (white on jungle night,
          pine on mint paper) instead of always-white. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <TransactionModal />
      <WalletsModal />
      <LegalModal />
      <UpdateModal />
      <ReportsModal />
      <BackupRestoreModal />
      <BudgetAlertsHost />
      <ConfirmSheet />
      <ToastHost />
      {/* privacy curtain over all content, under the pin gate and boot curtain */}
      <PrivacyShield />
      <AppLockGate />
      <LoadingScreen ready={finance.ready && fontsLoaded} onDone={() => setBooting(false)} />
    </NavigationContainer>
  );
}

export default function App() {
  const initialMetrics = useMemo(webInitialMetrics, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* everything renders inside this boundary — a render bug can never
          leave the user on a blank screen; they always get a way back in */}
      <ErrorBoundary>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ThemeProvider>
          <FinanceProvider>
            <TasksProvider>
              <BudgetsProvider>
                <BillsProvider>
                  <RecurringProvider>
                    <GoalsProvider>
                      <LockProvider>
                        <UIProvider>
                          <Shell />
                        </UIProvider>
                      </LockProvider>
                    </GoalsProvider>
                  </RecurringProvider>
                </BillsProvider>
              </BudgetsProvider>
            </TasksProvider>
          </FinanceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
