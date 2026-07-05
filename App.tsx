import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider as StoreProvider } from 'react-redux';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import axios from 'axios';
import { store } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { logout } from './src/redux/authSlice';
import { requestSmsPermissions, setupSmsListener } from './src/utils/smsReceiver';

// Global Axios Interceptor to catch 401 Unauthorized and auto-logout
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout on token expiration or invalidation
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

const customTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6C63FF',
    background: '#1E1E2C',
    surface: '#252538',
    text: '#FFFFFF',
  },
};

function App() {
  useEffect(() => {
    // Setup Android SMS capturing
    const initializeSms = async () => {
      const allowed = await requestSmsPermissions();
      if (allowed) {
        const cleanup = setupSmsListener();
        return cleanup;
      }
    };
    
    let cleanupFn: (() => void) | undefined;
    initializeSms().then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, []);

  // Use following to connect with android device
  // adb pair <device-ip>:<port>
  // eg adb pair 192.168.0.8:43655
  // adb reverse tcp:5000 tcp:5000
  // adb reverse tcp:5001 tcp:5001

  
  return (
    <StoreProvider store={store}>
      <PaperProvider theme={customTheme}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#1E1E2C" />
          <AppNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </StoreProvider>
  );
}

export default App;
