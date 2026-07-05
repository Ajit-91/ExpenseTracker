import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { loginUser, clearAuthError } from '../redux/authSlice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const handleLogin = () => {
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  const navigateToSignup = () => {
    dispatch(clearAuthError());
    navigation.navigate('Signup');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Track your expenses smart, with AI guidance</Text>
        </View>

        <Surface style={styles.formCard} elevation={2}>
          <Text style={styles.formTitle}>Sign In</Text>

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || !email || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Log In
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Text style={styles.link} onPress={navigateToSignup}>
              Sign Up
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C', // Sleek dark mode background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0C0',
    textAlign: 'center',
  },
  formCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#252538', // Dark card
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#252538',
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: '#6C63FF', // Vibrant custom indigo/blue accent
  },
  buttonContent: {
    paddingVertical: 6,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#A0A0C0',
  },
  link: {
    color: '#6C63FF',
    fontWeight: 'bold',
  },
});
