import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { auth } from '../config/firebase-config';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const Login: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      easing: Easing.out(Easing.exp),
    }).start();
  }, []);

  const showError = (message: string) => {
    setError(message);
    Animated.sequence([
      Animated.timing(errorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setError(''));
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      // navigate to home or next screen
    } catch (error: any) {
      console.log(error);
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(handleLogin);
  };

  return (
    <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.container}>
      {/* 🔔 Animated Error Banner */}
      {error ? (
        <Animated.View
          style={[
            styles.errorContainer,
            {
              opacity: errorAnim,
              transform: [
                {
                  translateY: errorAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Welcome Back 👋</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#ccc"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#ccc"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={animateButton}
            style={styles.loginButton}
          >
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>No account? Sign up</Text>
        </TouchableOpacity>
      </Animated.View>

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Logging in...</Text>
        </View>
      )}
    </LinearGradient>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 69, 58, 0.9)',
    padding: 12,
    borderRadius: 10,
    zIndex: 10,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 24,
    color: '#fff',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
    color: '#fff',
  },
  loginButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  loginText: {
    textAlign: 'center',
    color: '#2575fc',
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    color: '#fff',
    marginTop: 15,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});
