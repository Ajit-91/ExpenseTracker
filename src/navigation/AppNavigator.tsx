import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, NativeModules, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { restoreSession } from '../redux/authSlice';
import { storage } from '../utils/storage';

import LoginScreen from '../screens/LoginScreen.tsx';
import SignupScreen from '../screens/SignupScreen.tsx';
import MainTabScreen from '../screens/MainTabScreen.tsx';
import AddEditExpenseScreen from '../screens/AddEditExpenseScreen.tsx';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: { initialTab?: 'dashboard' | 'expenses' | 'chat' };
  AddEditExpense: { expenseId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Helper to decode JWT and check expiration
function isTokenExpired(token: string): boolean {
  try {
    console.log('[isTokenExpired] Inspecting token:', token.substring(0, 20) + '...');
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[isTokenExpired] Token is invalid, does not have 3 parts');
      return true;
    }

    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    let decoded = '';
    // Try global atob first
    if (typeof global.atob === 'function') {
      try {
        decoded = global.atob(base64);
        console.log('[isTokenExpired] Successfully decoded using global.atob');
      } catch (err: any) {
        console.warn('[isTokenExpired] global.atob failed:', err.message);
      }
    }

    // Fallback to custom decoder if atob failed or returned empty
    if (!decoded) {
      console.log('[isTokenExpired] Running custom base64 decoder...');
      const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let output = '';
      const str = base64.replace(/=+$/, '');
      let bs = 0;
      for (let bc = 0, rlen = str.length; bc < rlen; bc++) {
        const char = str.charAt(bc);
        const idx = b64chars.indexOf(char);
        if (idx === -1) continue;
        bs = bc % 4 ? bs * 64 + idx : idx;
        if (bc % 4) {
          output += String.fromCharCode(255 & (bs >> ((-2 * (bc % 4)) & 6)));
        }
      }
      decoded = output;
    }

    // Remove any trailing null characters or garbage that could break JSON parsing
    decoded = decoded.replace(/[\u0000-\u0019]+/g, "").trim();

    console.log('[isTokenExpired] Decoded payload string:', decoded);
    const payload = JSON.parse(decoded);
    if (!payload.exp) {
      console.log('[isTokenExpired] No expiration field found in token, assuming not expired');
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;
    console.log(`[isTokenExpired] Exp: ${payload.exp}, Current Time: ${currentTime}, IsExpired: ${isExpired}`);
    return isExpired;
  } catch (e: any) {
    console.error('[isTokenExpired] Critical decoding error:', e.message);
    return true; // Treat decoding errors as expired/invalid tokens
  }
}

export default function AppNavigator() {
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const SmsModule = NativeModules.SmsModule;
    if (token) {
      console.log('[AppNavigator] Token changed, syncing config to native SharedPreferences...');
      if (Platform.OS === 'android' && SmsModule && typeof SmsModule.saveConfig === 'function') {
        SmsModule.saveConfig(token, process.env.API_URL || '');
      }
    } else {
      console.log('[AppNavigator] Token cleared, wiping native SharedPreferences config...');
      if (Platform.OS === 'android' && SmsModule && typeof SmsModule.clearConfig === 'function') {
        SmsModule.clearConfig();
      }
    }
  }, [token]);

  useEffect(() => {
    const checkSession = async () => {
      console.log('[checkSession] Querying AsyncStorage for user_session...');
      try {
        const sessionStr = await storage.getItem('user_session');
        console.log('[checkSession] AsyncStorage returned sessionStr:', sessionStr);
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session?.token && session?.userId && session?.email) {
            console.log('[checkSession] Found valid session fields. Checking expiration...');
            if (isTokenExpired(session.token)) {
              console.log('[checkSession] Stored token has expired. Clearing session.');
              await storage.removeItem('user_session');
            } else {
              console.log('[checkSession] Token valid! Dispatching restoreSession...');
              dispatch(restoreSession({
                token: session.token,
                userId: session.userId,
                email: session.email
              }));
            }
          } else {
            console.warn('[checkSession] Session structure was incomplete:', session);
          }
        } else {
          console.log('[checkSession] No stored user_session found.');
        }
      } catch (err: any) {
        console.error('[checkSession] Error restoring session:', err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [dispatch]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1E1E2C', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          // Auth flow
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          // Authenticated app flow
          <>
            <Stack.Screen name="Main" component={MainTabScreen} />
            <Stack.Screen name="AddEditExpense" component={AddEditExpenseScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
