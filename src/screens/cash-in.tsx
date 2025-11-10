import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  ToastAndroid,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { auth, firestore } from '../config/firebase-config';

type Props = NativeStackScreenProps<RootStackParamList, 'CashIn'>;

const CashIn: React.FC<Props> = ({ route, navigation }) => {
  const { passbookId, expense } = route.params;
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // For add category bottom sheet
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // For delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const user = auth().currentUser;

  // Fetch inCategories
  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection('passbooks')
      .doc(user.uid)
      .collection('inCategories') // <--- separate collection for CashIn
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snapshot => {
          const userCategories = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
          }));
          setCategories(userCategories);
          if (userCategories.length > 0 && !category)
            setCategory(userCategories[0].name);
          setFetching(false);
        },
        error => {
          console.error('Error fetching inCategories:', error);
          setFetching(false);
        },
      );

    return () => unsubscribe();
  }, [user]);

  // Pre-fill existing data if editing
  useEffect(() => {
    if (expense) {
      setAmount(String(expense?.amount));
      setCategory(expense?.category);
      setNote(expense?.note);
    }
  }, [expense, categories]);

  // Add category to inCategories
  const addCategoryToFirestore = async () => {
    if (!newCategory.trim()) {
      ToastAndroid.show('Please enter category name', ToastAndroid.SHORT);
      return;
    }
    try {
      await firestore()
        .collection('passbooks')
        .doc(user!.uid)
        .collection('inCategories') // <--- separate collection
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

  // Delete category from inCategories
  const handleDeleteCategory = async () => {
    if (!selectedCategory || !user) return;
    try {
      await firestore()
        .collection('passbooks')
        .doc(user.uid)
        .collection('inCategories') // <--- separate collection
        .doc(selectedCategory.id)
        .delete();
      ToastAndroid.show('Category deleted', ToastAndroid.SHORT);
      setSelectedCategory(null);
      setShowDeleteModal(false);
    } catch (e) {
      console.error('Failed to delete category:', e);
      ToastAndroid.show('Failed to delete category', ToastAndroid.SHORT);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!amount.trim()) {
      ToastAndroid.show('Please enter the amount', ToastAndroid.SHORT);
      return;
    }
    if (!category.trim()) {
      ToastAndroid.show('Please select a category', ToastAndroid.SHORT);
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
        const passbookSnap = await transaction.get(passbookRef);
        const data = passbookSnap.data() || {};
        const newAmount = parseFloat(amount);
        const oldAmount = expense ? parseFloat(expense.amount) : 0;

        let totalIn = data.totalIn || 0;
        let netBalance = data.netBalance || 0;

        if (expense) {
          totalIn -= oldAmount;
          netBalance -= oldAmount;
        }

        totalIn += newAmount;
        netBalance += newAmount;

        const entryRef = expense
          ? passbookRef.collection('entries').doc(expense.id)
          : passbookRef.collection('entries').doc();

        transaction.set(
          entryRef,
          {
            category,
            amount: newAmount,
            note: note.trim(),
            type: 'in',
            createdAt: expense
              ? expense.createdAt
              : firestore.FieldValue.serverTimestamp(),
            balanceAtTime: netBalance,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        transaction.update(passbookRef, {
          totalIn,
          netBalance,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      });

      ToastAndroid.show(
        expense ? 'Entry updated successfully' : 'Cash In added successfully',
        ToastAndroid.SHORT,
      );
      navigation.pop(expense ? 2 : 1);
    } catch (error) {
      console.error(error);
      ToastAndroid.show('Failed to save cash in entry', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {fetching ? (
          <ActivityIndicator size="large" color="#4CAF50" />
        ) : (
          <>
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
                <Icon name="add-circle-outline" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>

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

            <Text style={styles.label}>Note</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Enter note"
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#4CAF50' }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {expense ? 'Update Entry' : 'Add Cash In'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

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
                style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
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

export default CashIn;

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f7f8fa' },
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
  selectedCategory: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
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
