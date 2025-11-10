import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { firestore, auth } from '../config/firebase-config';
import { IndCurrency } from '../utils/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpenseDetail'>;

const ExpenseDetail: React.FC<Props> = ({ route, navigation }) => {
  const { expense, passbookId } = route.params;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current; // for modal slide up
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDelete = async () => {
    try {
      setLoading(true);
      const passbookRef = firestore()
        .collection('passbooks')
        .doc(user!.uid)
        .collection('userPassbooks')
        .doc(passbookId);

      await firestore().runTransaction(async transaction => {
        const passbookSnap = await transaction.get(passbookRef);
        const passbookData = passbookSnap.data() || {};

        const amount = parseFloat(expense.amount);
        let { totalIn = 0, totalOut = 0, netBalance = 0 } = passbookData;

        if (expense.type === 'in') {
          totalIn -= amount;
          netBalance -= amount;
        } else {
          totalOut -= amount;
          netBalance += amount;
        }

        // Prevent negative totals
        totalIn = totalIn;
        totalOut = totalOut;
        netBalance = netBalance;

        // Delete the entry
        const entryRef = passbookRef.collection('entries').doc(expense.id);
        transaction.delete(entryRef);

        // Update the totals
        transaction.update(passbookRef, {
          totalIn,
          totalOut,
          netBalance,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      });

      setShowModal(false);
      navigation.goBack();
      ToastAndroid.show('Entry deleted successfully', ToastAndroid.SHORT);
    } catch (error) {
      console.log(error);
      ToastAndroid.show(
        'Failed to delete the entry. Please try again.',
        ToastAndroid.SHORT,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate(expense.type === 'in' ? 'CashIn' : 'CashOut', {
      passbookId: passbookId,
      expense: expense,
    } as any);
  };

  const openDeleteModal = () => {
    setShowModal(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDeleteModal = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowModal(false));
  };

  const createdAt = expense.createdAt?.seconds
    ? new Date(expense.createdAt.seconds * 1000).toLocaleString()
    : 'N/A';

  return (
    <>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{expense.category}</Text>

          <Text style={styles.label}>Amount</Text>
          <Text
            style={[
              styles.amount,
              expense.type === 'in' ? styles.inAmount : styles.outAmount,
            ]}
          >
            ₹{IndCurrency(expense?.amount)}
          </Text>

          {expense.note ? (
            <>
              <Text style={styles.label}>Note</Text>
              <Text style={styles.value}>{expense?.note}</Text>
            </>
          ) : null}

          <Text style={styles.label}>Balance After</Text>
          <Text style={styles.value}>
            ₹{IndCurrency(expense?.balanceAtTime)}
          </Text>

          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>
            {expense.type === 'in' ? 'Cash In' : 'Cash Out'}
          </Text>

          <Text style={styles.label}>Created At</Text>
          <Text style={styles.value}>{createdAt}</Text>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#2575fc' }]}
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#e0e0e0' }]}
            onPress={openDeleteModal}
            activeOpacity={0.8}
          >
            <Text style={{ ...styles.buttonText, color: '#333' }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* 🔽 Delete Confirmation Modal */}
      <Modal transparent visible={showModal} animationType="none">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeDeleteModal}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.modalTitle}>Delete Entry?</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to delete this entry? This action cannot be
            undone.
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeDeleteModal}
            >
              <Text style={[styles.modalButtonText, { color: '#333' }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
};

export default ExpenseDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f8fa',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  label: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  inAmount: { color: '#4CAF50' },
  outAmount: { color: '#FF3B30' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  button: {
    flex: 0.47,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  modalMessage: {
    color: '#555',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#eee',
  },
  deleteButton: {
    backgroundColor: '#2575fc',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
