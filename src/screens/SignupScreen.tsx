import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { registerUser, clearAuthError } from '../redux/authSlice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const handleSignup = () => {
    if (!email || !password) return;
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError('');
    dispatch(registerUser({ email, password }));
  };

  const navigateToLogin = () => {
    dispatch(clearAuthError());
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Begin tracking your expenditures seamlessly</Text>
        </View>

        <Surface style={styles.formCard} elevation={2}>
          <Text style={styles.formTitle}>Sign Up</Text>

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

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="lock-check" />}
          />

          {(error || passwordError) && (
            <HelperText type="error" visible={!!error || !!passwordError} style={styles.errorText}>
              {passwordError || error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={loading}
            disabled={loading || !email || !password || !confirmPassword}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Create Account
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text style={styles.link} onPress={navigateToLogin}>
              Log In
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
    backgroundColor: '#1E1E2C',
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
    backgroundColor: '#252538',
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
    backgroundColor: '#6C63FF',
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
