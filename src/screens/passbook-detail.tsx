import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/root-navigator';
import { auth, firestore } from '../config/firebase-config';
import moment from 'moment';
import { height, IndCurrency } from '../utils/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'PassbookDetail'>;

type Expense = {
  id: string;
  type: 'in' | 'out';
  amount: number;
  category: string;
  note?: string;
  createdAt: any;
  balanceAtTime?: number;
};

type Totals = {
  totalIn: number;
  totalOut: number;
  netBalance: number;
};

const PAGE_SIZE = 10;

const PassbookDetail: React.FC<Props> = ({ navigation, route }) => {
  const { passbookId, passbookName } = route.params;
  const user = auth().currentUser;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totals, setTotals] = useState<Totals>({
    totalIn: 0,
    totalOut: 0,
    netBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchTotals = async () => {
    if (!user || !passbookId) return;
    try {
      const snap = await firestore()
        .collection('passbooks')
        .doc(user.uid)
        .collection('userPassbooks')
        .doc(passbookId)
        .get();
      const data = snap.data() || {};
      setTotals({
        totalIn: data.totalIn || 0,
        totalOut: data.totalOut || 0,
        netBalance: data.netBalance || 0,
      });
    } catch (err) {
      console.log('Error fetching passbook totals:', err);
    }
  };

  const fetchExpenses = async (refresh = false) => {
    if (!user || !passbookId) return;
    if (refresh) {
      setRefreshing(true);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoading(true);
    }

    let query = firestore()
      .collection('passbooks')
      .doc(user.uid)
      .collection('userPassbooks')
      .doc(passbookId)
      .collection('entries')
      .orderBy('createdAt', 'desc')
      .limit(PAGE_SIZE);

    if (lastDoc && !refresh) query = query.startAfter(lastDoc);

    try {
      const snapshot = await query.get();
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Expense, 'id'>),
      })) as Expense[];

      setExpenses(prev => (refresh ? data : [...prev, ...data]));
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      if (snapshot.docs.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.log('Error fetching expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTotals();
    fetchExpenses(true);
  }, []);

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const date =
      item.createdAt?.toDate?.() != null
        ? moment(item.createdAt.toDate()).format('DD MMM YYYY, hh:mm A')
        : '-';

    return (
      <TouchableOpacity
        style={styles.expenseItem}
        onPress={() =>
          navigation.navigate('ExpenseDetail', {
            expense: item,
            passbookId: passbookId,
          })
        }
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.expenseCategory}>{item?.category}</Text>
          <Text style={styles.expenseDate}>{date}</Text>
          {item.note ? (
            <Text style={styles.expenseNote}>{item?.note}</Text>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              styles.expenseAmount,
              { color: item.type === 'in' ? 'green' : 'red' },
            ]}
          >
            {item.type === 'in' ? '+' : '-'} ₹{IndCurrency(item?.amount)}
          </Text>
          {item.note && <Text style={styles.expenseDate}></Text>}
          {item.balanceAtTime !== undefined && (
            <Text style={styles.balanceAtTime}>
              Bal: ₹{IndCurrency(item?.balanceAtTime)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) fetchExpenses();
  };

  return (
    <View style={styles.container}>
      {/* Top Card */}
      <View style={styles.topCard}>
        <Text style={styles.netBalance}>
          Net Balance: ₹{IndCurrency(totals?.netBalance)}
        </Text>
        <View style={styles.totalsRow}>
          <Text style={styles.totalIn}>
            In: ₹{IndCurrency(totals?.totalIn)}
          </Text>
          <Text style={styles.totalOut}>
            Out: ₹{IndCurrency(totals.totalOut)}
          </Text>
        </View>
      </View>

      {/* Expense List */}
      {loading && expenses.length === 0 ? (
        <ActivityIndicator
          style={{ marginTop: 30 }}
          size="large"
          color="#2575fc"
        />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={item => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                fetchTotals();
                fetchExpenses(true);
              }}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
        />
      )}
      <View style={{ height: height * 0.1 }} />
      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: 'green' }]}
          onPress={() => navigation.navigate('CashIn', { passbookId })}
        >
          <Text style={styles.buttonText}>Cash In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: 'red' }]}
          onPress={() => navigation.navigate('CashOut', { passbookId })}
        >
          <Text style={styles.buttonText}>Cash Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PassbookDetail;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  topCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
  },
  passbookTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  netBalance: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalIn: { fontSize: 16, color: 'green', fontWeight: '500' },
  totalOut: { fontSize: 16, color: 'red', fontWeight: '500' },

  expenseItem: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  expenseCategory: { fontSize: 15, fontWeight: '600', color: '#333' },
  expenseDate: { fontSize: 12, color: '#777', marginTop: 2 },
  expenseNote: { fontSize: 13, color: '#888', marginTop: 4 },
  expenseAmount: { fontSize: 16, fontWeight: '700' },
  balanceAtTime: { fontSize: 12, color: '#666', marginTop: 4 },

  bottomButtons: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 0.48,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
