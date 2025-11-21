import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { auth, firestore } from '../config/firebase-config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ZeroState from './common/zerostate';

type Props = NativeStackScreenProps<RootStackParamList, 'CashOut'>;

const CashOut: React.FC<Props> = ({ route, navigation }) => {
  const { passbookId, expense } = route.params;
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Add category modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Delete category modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const user = auth().currentUser;

  // Fetch outCategories from Firestore
  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection('passbooks')
      .doc(user.uid)
      .collection('outCategories')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snapshot => {
          const cats = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
          }));
          setCategories(cats);
          setFetching(false);
        },
        error => {
          console.error('Error fetching outCategories:', error);
          setFetching(false);
        },
      );

    return () => unsubscribe();
  }, [user]);

  // Pre-fill if editing expense
  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setCategory(expense.category);
      setNote(expense.note || '');
    }
  }, [expense]);

  // Add new outCategory
  const addCategoryToFirestore = async () => {
    if (!newCategory.trim()) {
      ToastAndroid.show('Enter category name', ToastAndroid.SHORT);
      return;
    }
    try {
      await firestore()
        .collection('passbooks')
        .doc(user!.uid)
        .collection('outCategories')
        .add({
          name: newCategory.trim(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      ToastAndroid.show('Category added', ToastAndroid.SHORT);
      setNewCategory('');
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
      ToastAndroid.show('Failed to add category', ToastAndroid.SHORT);
    }
  };

  // Delete outCategory
  const handleDeleteCategory = async () => {
    if (!selectedCategory || !user) return;
    try {
      await firestore()
        .collection('passbooks')
        .doc(user.uid)
        .collection('outCategories')
        .doc(selectedCategory.id)
        .delete();
      ToastAndroid.show('Category deleted', ToastAndroid.SHORT);
      setSelectedCategory(null);
      setShowDeleteModal(false);
    } catch (e) {
      console.error(e);
      ToastAndroid.show('Failed to delete category', ToastAndroid.SHORT);
    }
  };

  // Submit CashOut
  const handleSubmit = async () => {
    if (!amount.trim()) {
      ToastAndroid.show('Enter amount', ToastAndroid.SHORT);
      return;
    }

    setLoading(true);
    try {
      const passbookRef = firestore()
        .collection('passbooks')
        .doc(user!.uid)
        .collection('userPassbooks')
        .doc(passbookId);

      await firestore().runTransaction(async transaction => {
        const snap = await transaction.get(passbookRef);
        const data = snap.data() || {};
        let { totalOut = 0, netBalance = 0 } = data;
        const newAmount = parseFloat(amount);

        if (expense) {
          const oldAmount = parseFloat(expense.amount);
          netBalance += oldAmount;
          totalOut -= oldAmount;

          totalOut += newAmount;
          netBalance -= newAmount;

          const entryRef = passbookRef.collection('entries').doc(expense.id);
          transaction.update(entryRef, {
            category,
            amount: newAmount,
            note: note.trim(),
            balanceAtTime: netBalance,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        } else {
          totalOut += newAmount;
          netBalance -= newAmount;

          const entryRef = passbookRef.collection('entries').doc();
          transaction.set(entryRef, {
            category,
            amount: newAmount,
            note: note.trim(),
            type: 'out',
            createdAt: firestore.FieldValue.serverTimestamp(),
            balanceAtTime: netBalance,
          });
        }

        transaction.update(passbookRef, {
          totalOut,
          netBalance,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      });

      ToastAndroid.show(
        expense ? 'Entry updated successfully' : 'Cash Out added successfully',
        ToastAndroid.SHORT,
      );
      navigation.pop(expense ? 2 : 1);
    } catch (error) {
      console.error(error);
      ToastAndroid.show(
        'Failed to add/update cash out entry',
        ToastAndroid.SHORT,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
        />

        <View style={styles.categoryHeader}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)}>
            <Icon name="add-circle-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {fetching ? (
          <ActivityIndicator size="small" color="#FF3B30" />
        ) : categories.length == 0 ? (
          <ZeroState message="No categories found" />
        ) : (
          <View style={styles.categoryContainer}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  category === cat.name && styles.selectedCategory,
                ]}
                onPress={() => setCategory(cat.name)}
                onLongPress={() => {
                  setSelectedCategory(cat);
                  setShowDeleteModal(true);
                }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.name && { color: '#fff' },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Enter note"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF3B30' }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {expense ? 'Save Changes' : 'Add Cash Out'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>Add New Category</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter category name"
              value={newCategory}
              onChangeText={setNewCategory}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
                onPress={addCategoryToFirestore}
              >
                <Text style={{ color: '#fff' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>
              Delete "{selectedCategory?.name}"?
            </Text>
            <Text style={{ marginBottom: 15, color: '#555' }}>
              Are you sure you want to delete this category?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'red' }]}
                onPress={handleDeleteCategory}
              >
                <Text style={{ color: '#fff' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default CashOut;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f7f8fa' },
  label: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedCategory: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  categoryText: { color: '#333' },
  button: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
