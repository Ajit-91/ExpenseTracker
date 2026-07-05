import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Surface, Card, Title, Paragraph, IconButton, Chip, FAB, Portal, Dialog, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { fetchExpenses, deleteExpense } from '../redux/expenseSlice';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

const CATEGORIES = ['All', 'Food', 'Travel', 'Shopping', 'Bills', 'Other'];

export default function ExpenseListScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { list: expenses, loading } = useSelector((state: RootState) => state.expenses);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Dialog state for deletion confirmation
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const loadData = async () => {
    setRefreshing(true);
    await dispatch(fetchExpenses(currentMonth));
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setCurrentMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    setCurrentMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const showDeleteConfirm = (id: string) => {
    setExpenseToDelete(id);
    setDeleteDialogVisible(true);
  };

  const handleDelete = async () => {
    if (expenseToDelete) {
      await dispatch(deleteExpense(expenseToDelete));
      setDeleteDialogVisible(false);
      setExpenseToDelete(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
        return 'food-fork-drink';
      case 'travel':
        return 'car-side';
      case 'shopping':
        return 'cart';
      case 'bills':
        return 'file-document';
      default:
        return 'cash-multiple';
    }
  };

  // Filter local expense list based on category selection
  const filteredExpenses = expenses.filter((exp) => {
    if (selectedCategory === 'All') return true;
    return exp.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <View style={styles.container}>
      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <IconButton icon="chevron-left" iconColor="#FFF" size={28} onPress={handlePrevMonth} />
        <Text style={styles.monthLabel}>{formatMonthName(currentMonth)}</Text>
        <IconButton icon="chevron-right" iconColor="#FFF" size={28} onPress={handleNextMonth} />
      </View>

      {/* Categories Horizontal Filter List */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item}
              onPress={() => setSelectedCategory(item)}
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.selectedChip,
              ]}
              textStyle={[
                styles.chipText,
                selectedCategory === item && styles.selectedChipText,
              ]}
              showSelectedOverlay
            >
              {item}
            </Chip>
          )}
        />
      </View>

      {/* Expense List */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#6C63FF']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconButton icon="clipboard-text-outline" iconColor="#A0A0C0" size={64} />
            <Text style={styles.emptyText}>No expenses found matching the filters.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddEditExpense', { expenseId: item._id })}
          >
            <Card style={styles.expenseCard}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.iconCircle}>
                  <IconButton
                    icon={getCategoryIcon(item.category)}
                    iconColor="#6C63FF"
                    size={24}
                    style={styles.cardIcon}
                  />
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseDesc}>{item.description}</Text>
                  <Paragraph style={styles.expenseSub}>
                    {item.category} • {new Date(item.date).toLocaleDateString()}
                  </Paragraph>
                </View>
                <View style={styles.amountSection}>
                  <Text style={styles.expenseAmt}>Rs. {item.amount.toLocaleString()}</Text>
                  <IconButton
                    icon="delete-outline"
                    iconColor="#FF4A4A"
                    size={20}
                    onPress={() => showDeleteConfirm(item._id)}
                    style={styles.deleteBtn}
                  />
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* Floating Action Button (FAB) to Add Expense */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFF"
        onPress={() => navigation.navigate('AddEditExpense', {})}
      />

      {/* Portal Dialog for Deletion Confirmation */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Delete Expense</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogText}>
              Are you sure you want to permanently delete this expense transaction?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)} textColor="#A0A0C0">
              Cancel
            </Button>
            <Button onPress={handleDelete} textColor="#FF4A4A">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  categoriesWrapper: {
    height: 48,
    marginBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#252538',
    borderColor: '#2D2D44',
    borderWidth: 1,
  },
  selectedChip: {
    backgroundColor: '#6C63FF',
  },
  chipText: {
    color: '#A0A0C0',
  },
  selectedChipText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  expenseCard: {
    marginBottom: 12,
    backgroundColor: '#252538',
    borderRadius: 12,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    margin: 0,
  },
  expenseDetails: {
    marginLeft: 12,
    flex: 1,
  },
  expenseDesc: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  expenseSub: {
    fontSize: 12,
    color: '#A0A0C0',
    marginTop: 2,
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  expenseAmt: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  deleteBtn: {
    margin: 0,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#A0A0C0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
    borderRadius: 28,
  },
  dialog: {
    backgroundColor: '#252538',
    borderRadius: 16,
  },
  dialogTitle: {
    color: '#FFF',
  },
  dialogText: {
    color: '#A0A0C0',
  },
});
