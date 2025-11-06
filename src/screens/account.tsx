import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ToastAndroid,
} from 'react-native';
import { auth } from '../config/firebase-config';

const Account = () => {
  const user = auth().currentUser;

  const handleLogout = async () => {
    try {
      await auth().signOut();
      ToastAndroid.show('Logged out successfully', ToastAndroid.SHORT);
    } catch (error) {
      console.log('Logout error:', error);
      ToastAndroid.show('Failed to logout', ToastAndroid.SHORT);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || '-'}</Text>

        <Text style={[styles.label, { marginTop: 10 }]}>User ID:</Text>
        <Text style={styles.value}>{user?.uid || '-'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Account;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    justifyContent: 'space-between',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    marginTop: 40,
  },
  label: { fontSize: 14, color: '#666', fontWeight: '500' },
  value: { fontSize: 16, color: '#000', fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#e53935',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
