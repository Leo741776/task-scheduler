import { useEffect, useMemo, useState } from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { configureAuthBridge } from '../src/model/services/apiClient';
import { useAuthStore } from '../src/viewmodel/stores/authStore';
import { useTaskStore } from '../src/viewmodel/stores/taskStore';
import { useFolderStore } from '../src/viewmodel/stores/folderStore';

import { AppColors, ThemeProvider, useTheme } from '../src/nativeTheme';

// Wire the Model auth bridge once at module load, before any component
// mounts and before any protected request can fire. Keeps apiClient free
// of ViewModel imports while preserving the bearer header and 401 logout
// behavior.
configureAuthBridge({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    const { token, logout } = useAuthStore.getState();
    if (token) logout();
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Splash screen visible until app startup is complete.
SplashScreen.preventAutoHideAsync();

function ThemedAppShell() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={colors.bg}
      />
      <Slot />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const loadFolders = useFolderStore((s) => s.loadFolders);

  useEffect(() => {
    let isCancelled = false;

    async function prepare() {
      try {
        // Restore auth/session state first.
        await initializeAuth();

        // Read the latest auth state after initialization finishes.
        const { user, token } = useAuthStore.getState();

        // If logged in, load startup data.
        if (user && token) {
          const results = await Promise.allSettled([
            loadFolders(),
            loadTasks(),
          ]);

          results.forEach((result) => {
            if (result.status === 'rejected') {
              console.log('Startup load failed:', result.reason);
            }
          });
        }

        // Load fonts, persistent stores, etc. here later.
      } catch (err) {
        console.log('Failed to prepare app:', err);
      } finally {
        if (!isCancelled) {
          setIsReady(true);
          await SplashScreen.hideAsync();
        }
      }
    }

    prepare();

    return () => {
      isCancelled = true;
    };
  }, [initializeAuth, loadFolders, loadTasks]);

  if (!isReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedAppShell />
    </ThemeProvider>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
  });