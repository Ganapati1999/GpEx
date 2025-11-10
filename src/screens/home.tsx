import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { auth, firestore } from '../config/firebase-config';
import { IndCurrency } from '../utils/utils';
import { authenticateBiometric, isBiometricAvailable } from '../utils/bioatrix'; // 🔐

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type Passbook = {
  id: string;
  name: string;
  updatedAt?: any;
  netBalance?: number;
};

const Home: React.FC<Props> = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [passbooks, setPassbooks] = useState<Passbook[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(true); // 🔐 locked initially
  const [authInProgress, setAuthInProgress] = useState(true);
  const user = auth().currentUser;

  // 🔐 Biometric Authentication with fallback
  const runBiometricAuth = useCallback(async () => {
    setAuthInProgress(true);
    try {
      const available = await isBiometricAvailable();
      if (!available) {
        // No biometric hardware — skip lock
        setLocked(false);
        setAuthInProgress(false);
        return;
      }

      const success = await authenticateBiometric();

      if (success) {
        setLocked(false);
      } else {
        // too many attempts or canceled
        Alert.alert(
          'Authentication failed',
          'Biometric verification unavailable or too many failed attempts.',
          [
            {
              text: 'Try Again',
              onPress: () => runBiometricAuth(),
            },
          ],
        );
      }
    } catch (error: any) {
      console.log('Biometric error:', error);
      Alert.alert(
        'Biometric Error',
        'Too many failed attempts or sensor unavailable. ',
        [{ text: 'OK', onPress: () => setLocked(false) }],
      );
    } finally {
      setAuthInProgress(false);
    }
  }, []);

  useEffect(() => {
    runBiometricAuth();
  }, [runBiometricAuth]);

  // 🔥 Fetch Firestore Passbooks
  const fetchPassbooks = useCallback(() => {
    if (!user) return;
    setRefreshing(true);
    firestore()
      .collection('passbooks')
      .doc(user.uid)
      .collection('userPassbooks')
      .orderBy('updatedAt', 'desc')
      .get()
      .then(snapshot => {
        const data = snapshot.docs.map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Passbook),
        );
        setPassbooks(data);
      })
      .finally(() => setRefreshing(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection('passbooks')
      .doc(user.uid)
      .collection('userPassbooks')
      .orderBy('updatedAt', 'desc')
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Passbook),
        );
        setPassbooks(data);
      });
    return unsubscribe;
  }, [user]);

  // 🕶️ Initial screen before auth completes
  if (authInProgress) {
    return (
      <View style={styles.lockScreen}>
        <ActivityIndicator size="large" color="#2575fc" />
        <Text style={{ marginTop: 12 }}>Starting secure session...</Text>
      </View>
    );
  }

  // 🔒 Waiting for biometric unlock or fallback
  if (locked) {
    return (
      <View style={styles.lockScreen}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
          🔐 Secure Access Required
        </Text>
        <TouchableOpacity
          onPress={runBiometricAuth}
          style={styles.tryAgainButton}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Try Biometric Again
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setLocked(false)}
          style={[styles.tryAgainButton, { backgroundColor: '#555' }]}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Use App PIN / Pattern
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Authenticated view
  const renderItem = ({ item }: { item: Passbook }) => (
    <TouchableOpacity
      style={styles.passbookItem}
      onPress={() =>
        navigation.navigate('PassbookDetail', {
          passbookId: item.id,
          passbookName: item.name,
        })
      }
    >
      <View>
        <Text style={styles.passbookTitle}>{item.name}</Text>
        {item.updatedAt && (
          <Text style={styles.passbookDate}>
            Updated on {new Date(item.updatedAt.toDate()).toLocaleDateString()}
          </Text>
        )}
      </View>

      <Text
        style={{
          ...styles.passBookAmount,
          color: (item?.netBalance ?? 0) < 0 ? '#d32f2f' : '#2e7d32',
        }}
      >
        ₹{IndCurrency(item?.netBalance ?? 0)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => Alert.alert('Add', 'Open your add modal here')}
      >
        <Text style={styles.addButtonText}>+ Add Passbook</Text>
      </TouchableOpacity>

      <Text style={styles.passbookHeader}>Your Books</Text>

      <FlatList
        data={passbooks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPassbooks} />
        }
      />
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f8fa',
    padding: 20,
  },
  tryAgainButton: {
    backgroundColor: '#2575fc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 12,
  },
  addButton: {
    backgroundColor: '#2575fc',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  passbookHeader: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 20,
    marginBottom: 4,
    color: '#333',
  },
  passbookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginHorizontal: 20,
  },
  passbookTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  passbookDate: { fontSize: 12, color: '#004d40', marginTop: 2 },
  passBookAmount: { fontSize: 18, fontWeight: '700' },
});
