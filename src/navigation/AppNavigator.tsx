import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
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
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    // Custom base64 decode for react-native environment
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

    const payload = JSON.parse(output);
    if (!payload.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (e) {
    return true; // Treat decoding errors as expired/invalid tokens
  }
}

export default function AppNavigator() {
  const token = useSelector((state: RootState) => state.auth.token);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionStr = await storage.getItem('user_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session?.token && session?.userId && session?.email) {
            if (isTokenExpired(session.token)) {
              console.log('Stored token has expired. Clearing session.');
              await storage.removeItem('user_session');
            } else {
              dispatch(restoreSession({
                token: session.token,
                userId: session.userId,
                email: session.email
              }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to check user session:', err);
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
