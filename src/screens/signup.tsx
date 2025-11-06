import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { auth } from '../config/firebase-config';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const Signup: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const showError = (message: string) => {
    setErrorMsg(message);
    errorAnim.setValue(0);
    Animated.timing(errorAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const handleSignup = async () => {
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await auth().createUserWithEmailAndPassword(email.trim(), password);
      ToastAndroid.show('Account created successfully', ToastAndroid.SHORT);
      navigation.navigate('Login');
    } catch (error: any) {
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
    ]).start(handleSignup);
  };

  return (
    <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.container}>
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Create Account</Text>

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

        {errorMsg !== '' && (
          <Animated.View
            style={[
              styles.errorContainer,
              {
                opacity: errorAnim,
                transform: [
                  {
                    translateY: errorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.errorText}>{errorMsg}</Text>
          </Animated.View>
        )}

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={animateButton}
            style={styles.signupButton}
          >
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </Animated.View>

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Creating account...</Text>
        </View>
      )}
    </LinearGradient>
  );
};

export default Signup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
  errorContainer: {
    marginTop: 5,
    marginBottom: 5,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  signupButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  signupText: {
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
