import { useState } from 'react';
import { StyleSheet, Text, View, ImageBackground, Alert, TextInput, TouchableOpacity, ActivityIndicator, } from 'react-native';
import { useRouter, } from 'expo-router';
import { globalStyles } from '@/styles/global';
import { apiRequest, setAuthToken, ApiError } from  '../api/client'

const plantimage = require('../../assets/images/login_leaves.png');

export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  created_at: string;
};

type AuthResponse = {
  token: string;
  user: User;
};

export default function WelcomeScreen() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);

  // Account fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  //clears password and reloads after failed login
  const resetForm = () => {
      setLoading(false);
      setPassword('');
  };
  const handleSubmit = async () => {
    if (isRegistering) {
      if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
        Alert.alert('Missing Info', 'Please fill out all fields to create an account.');
        return;
      }
    } else {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Missing Info', 'Please enter both your username and password.');
        return;
      }
    }
    if (password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    //sending api request
    try {
      const endpoint = isRegistering ? '/register' : '/login';
      const body = isRegistering
        ? {
            name: name.trim(),
            username: username.trim(),
            email: email.trim(),
            password,
          }
        : {
            email: email.trim(),
            password,
          };

      const data = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body,
      });

      // Save the token in memory so all future apiRequest calls include the Bearer header
      setAuthToken(data.token);
      setLoading(false);
      // navigate to the main app (tabs) after successful login or registration
      router.replace('/(tabs)');
      // API Error handling
    } catch (error) {

      const title =
        error instanceof ApiError && error.status === 0
          ? 'Connection Error'
          : isRegistering
          ? 'Registration Failed'
          : 'Login Failed';

      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      Alert.alert(
        title,
        message,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
            },
          },
        ],
        {
          // Ensures tapping outside the alert on Android also stops the spinner
          cancelable: true,
          onDismiss: resetForm,
        }
      );
    }
  };

  return (
    <ImageBackground
      source={plantimage}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <Text style={globalStyles.title}>
          {isRegistering ? 'Create Account' : 'Welcome to Roots!'}
        </Text>

        {isRegistering && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegistering ? 'Sign up' : 'Log in'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsRegistering(!isRegistering)}
        >
          <Text style={styles.switchText}>
            {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 340,
    height: 46,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginTop: 12,
    fontSize: 16,
  },
  button: {
    width: '100%',
    maxWidth: 340,
    height: 46,
    backgroundColor: '#27641f',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
  },
  switchText: {
    color: '#a0a0b0',
    fontWeight: '600',
  },
});