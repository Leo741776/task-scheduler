import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { useAuth } from '../src/viewmodel/hooks/useAuth';
import { VALIDATION } from '../src/constants';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, token } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Skip the login screen once persisted auth has rehydrated, or after a
  // successful login. Must run after every hook call so render hook count
  // stays stable across logged-out/logged-in renders.
  if (user && token) {
    return <Redirect href="/home" />;
  }

  const validate = () => {
    if (!username.trim()) return 'Username is required.';
    if (!password) return 'Password is required.';
    if (password.length < VALIDATION.USER.PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${VALIDATION.USER.PASSWORD_MIN_LENGTH} characters.`;
    }
    return '';
  };

  const handleLogin = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(username.trim(), password);
      // Navigation is handled by the Redirect above once user and token
      // are set in the auth store.
    } catch (error: any) {
      setErrorMessage(error?.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Login</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#a8a8a8"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#a8a8a8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.secondaryButtonText}>Register</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#C62828',
    marginBottom: 16,
    textAlign: 'center',
  },
});