import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { auth, firestore } from '../config/firebase-config';
import { useNavigation } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Passbook = {
  id: string;
  name: string;
  updatedAt?: any;
};

const Home: React.FC<Props> = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [passbooks, setPassbooks] = useState<Passbook[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newPassbookName, setNewPassbookName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth().currentUser;

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

  const handleDeletePassbook = async () => {
    if (!user || !deleteId) return;
    setLoading(true);
    try {
      await firestore()
        .collection('passbooks')
        .doc(user.uid)
        .collection('userPassbooks')
        .doc(deleteId)
        .delete();
      setDeleteModalVisible(false);
      setDeleteId(null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPassbook = async () => {
    if (!newPassbookName.trim()) return;

    setLoading(true);
    try {
      await firestore()
        .collection('passbooks')
        .doc(user!.uid)
        .collection('userPassbooks')
        .add({
          name: newPassbookName.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      setNewPassbookName('');
      setModalVisible(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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
            Updated at {new Date(item.updatedAt.toDate()).toLocaleDateString()}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => {
          setDeleteId(item.id);
          setDeleteModalVisible(true);
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#ff4d4d" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Add Passbook Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
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

      {/* Add Passbook Modal */}
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        style={styles.bottomModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New Passbook</Text>
          <TextInput
            placeholder="Enter passbook name"
            value={newPassbookName}
            onChangeText={setNewPassbookName}
            style={styles.modalInput}
          />
          <TouchableOpacity
            style={styles.modalButton}
            onPress={handleAddPassbook}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.modalButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isVisible={deleteModalVisible}
        onBackdropPress={() => setDeleteModalVisible(false)}
        style={styles.bottomModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete Passbook?</Text>
          <Text style={{ marginBottom: 15 }}>
            Are you sure you want to delete this passbook?
          </Text>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: '#ccc', flex: 0.45 },
              ]}
              onPress={() => setDeleteModalVisible(false)}
            >
              <Text style={{ ...styles.modalButtonText, color: '#000' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { flex: 0.45 }]}
              onPress={handleDeletePassbook}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
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

  bottomModal: { justifyContent: 'flex-end', margin: 0 },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#2575fc',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
