import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText, Appbar } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { createExpense, updateExpense } from '../redux/expenseSlice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

// Zod schema matching Zod configuration
const expenseFormSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  category: z.string().min(1, { message: 'Category is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format, must be YYYY-MM-DD',
  }),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditExpense'>;

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Other'];

export default function AddEditExpenseScreen({ route, navigation }: Props) {
  const { expenseId } = route.params || {};
  const isEditMode = !!expenseId;

  const dispatch = useDispatch<AppDispatch>();
  const expenses = useSelector((state: RootState) => state.expenses.list);
  const loading = useSelector((state: RootState) => state.expenses.loading);

  const [dateFieldFocused, setDateFieldFocused] = useState(false);

  // Find expense if we are in Edit Mode
  const existingExpense = isEditMode ? expenses.find((e) => e._id === expenseId) : null;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: '',
      category: 'Food',
      description: '',
      date: new Date().toISOString().split('T')[0], // Defaults to current YYYY-MM-DD
    },
  });

  // Load existing expense if edit mode
  useEffect(() => {
    if (isEditMode && existingExpense) {
      setValue('amount', existingExpense.amount.toString());
      setValue('category', existingExpense.category);
      setValue('description', existingExpense.description);
      setValue('date', new Date(existingExpense.date).toISOString().split('T')[0]);
    }
  }, [isEditMode, existingExpense]);

  const onSubmit = async (data: ExpenseFormData) => {
    const formattedData = {
      amount: parseFloat(data.amount),
      category: data.category,
      description: data.description,
      date: data.date,
    };

    if (isEditMode && expenseId) {
      await dispatch(updateExpense({ id: expenseId, ...formattedData }));
    } else {
      await dispatch(createExpense(formattedData));
    }

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* App Bar / Header */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction color="#FFF" onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={isEditMode ? 'Edit Expense' : 'Add Expense'}
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Surface style={styles.formCard} elevation={2}>
          {/* Amount Input */}
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Amount (Rs.)"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors.amount}
                  left={<TextInput.Icon icon="currency-inr" />}
                />
                {errors.amount && (
                  <HelperText type="error" visible={true} style={styles.helper}>
                    {errors.amount.message}
                  </HelperText>
                )}
              </View>
            )}
          />

          {/* Description Input */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Description / Merchant"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors.description}
                  left={<TextInput.Icon icon="note-text-outline" />}
                />
                {errors.description && (
                  <HelperText type="error" visible={true} style={styles.helper}>
                    {errors.description.message}
                  </HelperText>
                )}
              </View>
            )}
          />

          {/* Date Input */}
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Date (YYYY-MM-DD)"
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors.date}
                  placeholder="e.g. 2026-06-29"
                  left={<TextInput.Icon icon="calendar" />}
                />
                {errors.date && (
                  <HelperText type="error" visible={true} style={styles.helper}>
                    {errors.date.message}
                  </HelperText>
                )}
              </View>
            )}
          />

          {/* Category Chip Selection */}
          <Text style={styles.label}>Select Category</Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <View style={styles.categoryChips}>
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    mode={value === cat ? 'contained' : 'outlined'}
                    onPress={() => onChange(cat)}
                    style={[
                      styles.categoryChip,
                      value === cat ? styles.selectedCategoryChip : styles.outlinedCategoryChip,
                    ]}
                    textColor={value === cat ? '#FFF' : '#A0A0C0'}
                    compact
                  >
                    {cat}
                  </Button>
                ))}
              </View>
            )}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.submitBtn}
            contentStyle={styles.submitBtnContent}
          >
            {isEditMode ? 'Update Expense' : 'Add Expense'}
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2C',
  },
  appbar: {
    backgroundColor: '#252538',
  },
  appbarTitle: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
    flexGrow: 1,
  },
  formCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#252538',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#252538',
  },
  helper: {
    paddingHorizontal: 0,
  },
  label: {
    color: '#A0A0C0',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#6C63FF',
  },
  outlinedCategoryChip: {
    borderColor: '#2D2D44',
  },
  submitBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    marginTop: 10,
  },
  submitBtnContent: {
    paddingVertical: 6,
  },
});
