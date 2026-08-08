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
import { useRouter } from 'expo-router';

import { useAuth } from '../src/viewmodel/hooks/useAuth';
import { VALIDATION } from '../src/constants';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    if (!firstName.trim()) return 'First name is required.';
    if (!lastName.trim()) return 'Last name is required.';
    if (!username.trim()) return 'Username is required.';
    if (!password) return 'Password is required.';
    if (password.length < VALIDATION.USER.PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${VALIDATION.USER.PASSWORD_MIN_LENGTH} characters.`;
    }
    return '';
  };

  const handleRegister = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim(),
        password,
      });
      router.replace('/');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to create account. Please try again.');
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
        <Text style={styles.title}>Create Account</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#a8a8a8"
          autoCapitalize="words"
          value={firstName}
          onChangeText={setFirstName}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor="#a8a8a8"
          autoCapitalize="words"
          value={lastName}
          onChangeText={setLastName}
          returnKeyType="next"
        />
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

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={isLoading}>
          <Text style={styles.primaryButtonText}>{isLoading ? 'Creating account...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
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
