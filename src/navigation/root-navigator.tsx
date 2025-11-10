import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackHeaderProps,
} from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth } from '../config/firebase-config';
import Account from '../screens/account';
import CashIn from '../screens/cash-in';
import CashOut from '../screens/cash-out';
import ExpenseDetail from '../screens/expense-details';
import Home from '../screens/home';
import Login from '../screens/login';
import PassbookDetail from '../screens/passbook-detail';
import Signup from '../screens/signup';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  AddExpense: undefined;
  ExpenseDetail: { expense: any; passbookId: string };
  PassbookDetail: { passbookId: string; passbookName: string };
  CashIn: { passbookId: string; expense?: any };
  CashOut: { passbookId: string; expense?: any };
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// 🎨 Custom Gradient Header
const GradientHeader: React.FC<NativeStackHeaderProps> = ({
  navigation,
  route,
  options,
  back,
}) => {
  const isHome = route.name === 'Home';

  return (
    <LinearGradient
      colors={['#6a11cb', '#2575fc']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerContainer}
    >
      <View style={styles.headerInner}>
        {back ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon
              name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}

        <Text style={styles.headerTitle}>{options.title || route.name}</Text>

        {isHome ? (
          <TouchableOpacity onPress={() => navigation.navigate('Account')}>
            <Icon name="person-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
    </LinearGradient>
  );
};

// 🕐 Splash Screen (simple version)
const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <LinearGradient
      colors={['#6a11cb', '#2575fc']}
      style={StyleSheet.absoluteFill}
    />

    <Icon
      name="wallet-outline"
      size={80}
      color="#fff"
      style={{ marginBottom: 20 }}
    />

    <Text style={styles.splashTitle}>GP Expense Tracker</Text>

    <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
  </View>
);

const RootNavigator = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    // ⏳ Show Splash while checking auth
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          header: props => <GradientHeader {...props} />,
          headerTitleAlign: 'center',
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#f7f8fa' },
        }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="Home"
              component={Home}
              options={{ title: 'My Expenses' }}
            />
            <Stack.Screen
              name="ExpenseDetail"
              component={ExpenseDetail}
              options={{ title: 'Expense Details' }}
            />
            <Stack.Screen
              name="PassbookDetail"
              component={PassbookDetail}
              options={({ route }) => ({
                title: route.params?.passbookName || 'Passbook Detail',
              })}
            />
            <Stack.Screen
              name="CashIn"
              component={CashIn}
              options={{ title: 'Cash In' }}
            />
            <Stack.Screen
              name="CashOut"
              component={CashOut}
              options={{ title: 'Cash Out' }}
            />
            <Stack.Screen
              name="Account"
              component={Account}
              options={{ title: 'My Account' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={Signup}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  headerContainer: {
    height: 100,
    justifyContent: 'flex-end',
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: { padding: 4 },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
  },
});
