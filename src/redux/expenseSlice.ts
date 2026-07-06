import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from './authSlice';

export interface Expense {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

interface ExpenseSummary {
  totalSpent: number;
  topCategory: string;
}

interface ExpenseBreakdown {
  [category: string]: number;
}

interface ExpenseState {
  list: Expense[];
  summary: ExpenseSummary;
  breakdown: ExpenseBreakdown;
  loading: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  list: [],
  summary: { totalSpent: 0, topCategory: 'None' },
  breakdown: {},
  loading: false,
  error: null,
};

// Helper to get authorization header
const getAuthHeader = (getState: any) => {
  const token = getState().auth.token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const fetchExpenses = createAsyncThunk(
  'expenses/fetch',
  async (month: string | undefined, { getState, rejectWithValue }) => {
    try {
      const url = month ? `${API_URL}/expenses?month=${month}` : `${API_URL}/expenses`;
      const response = await axios.get(url, getAuthHeader(getState));
      return response.data.expenses;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch expenses');
    }
  }
);

export const fetchSummary = createAsyncThunk(
  'expenses/fetchSummary',
  async (month: string, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/analytics/summary?month=${month}`, getAuthHeader(getState));
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch summary');
    }
  }
);

export const fetchBreakdown = createAsyncThunk(
  'expenses/fetchBreakdown',
  async (month: string, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/analytics/breakdown?month=${month}`, getAuthHeader(getState));
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch breakdown');
    }
  }
);

export const createExpense = createAsyncThunk(
  'expenses/create',
  async (expenseData: { amount: number; category: string; description: string; date?: string }, { getState, rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(`${API_URL}/expenses`, expenseData, getAuthHeader(getState));
      // Refresh current summary and breakdown
      const date = expenseData.date || new Date().toISOString();
      const month = date.substring(0, 7);
      dispatch(fetchSummary(month));
      dispatch(fetchBreakdown(month));
      return response.data.expense;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create expense');
    }
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/update',
  async (
    { id, ...updateData }: { id: string; amount?: number; category?: string; description?: string; date?: string },
    { getState, rejectWithValue, dispatch }
  ) => {
    try {
      const response = await axios.put(`${API_URL}/expenses/${id}`, updateData, getAuthHeader(getState));
      const date = updateData.date || response.data.expense.date;
      const month = date.substring(0, 7);
      dispatch(fetchSummary(month));
      dispatch(fetchBreakdown(month));
      return response.data.expense;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update expense');
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id: string, { getState, rejectWithValue, dispatch, getState: getFullState }) => {
    try {
      await axios.delete(`${API_URL}/expenses/${id}`, getAuthHeader(getState));
      // Try to find the expense details to refresh summary of its month
      const state = getFullState() as { expenses: ExpenseState };
      const exp = state.expenses.list.find((e) => e._id === id);
      if (exp) {
        const month = exp.date.substring(0, 7);
        dispatch(fetchSummary(month));
        dispatch(fetchBreakdown(month));
      }
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete expense');
    }
  }
);

export const aiCategorizeExpense = createAsyncThunk(
  'expenses/aiCategorize',
  async ({ id, note }: { id: string; note: string }, { getState, rejectWithValue, dispatch }) => {
    try {
      console.log(`[aiCategorizeExpense] Initiating request. ID: ${id}, Note: "${note}"`);
      const url = `${API_URL}/expenses/${id}/ai-categorize`;
      console.log(`[aiCategorizeExpense] POST URL: ${url}`);
      
      const response = await axios.post(
        url,
        { note },
        getAuthHeader(getState)
      );
      
      console.log('[aiCategorizeExpense] Response received:', response.data);
      const updatedExpense = response.data.expense;
      const month = updatedExpense.date.substring(0, 7);
      dispatch(fetchSummary(month));
      dispatch(fetchBreakdown(month));
      return updatedExpense;
    } catch (err: any) {
      console.error('[aiCategorizeExpense] Error:', err.response?.data || err.message);
      return rejectWithValue(err.response?.data?.message || 'Failed to categorize expense with AI');
    }
  }
);

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearExpenseError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchExpenses.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchExpenses.fulfilled, (state, action: PayloadAction<Expense[]>) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(fetchExpenses.rejected, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Summary
    builder.addCase(fetchSummary.fulfilled, (state, action: PayloadAction<ExpenseSummary>) => {
      state.summary = action.payload;
    });

    // Breakdown
    builder.addCase(fetchBreakdown.fulfilled, (state, action: PayloadAction<ExpenseBreakdown>) => {
      state.breakdown = action.payload;
    });

    // Create
    builder.addCase(createExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
      state.list.unshift(action.payload);
    });

    // Update
    builder.addCase(updateExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
      const idx = state.list.findIndex((e) => e._id === action.payload._id);
      if (idx !== -1) {
        state.list[idx] = action.payload;
      }
    });

    // Delete
    builder.addCase(deleteExpense.fulfilled, (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((e) => e._id !== action.payload);
    });

    // AI Categorize
    builder.addCase(aiCategorizeExpense.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(aiCategorizeExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
      state.loading = false;
      const index = state.list.findIndex((e) => e._id === action.payload._id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    });
    builder.addCase(aiCategorizeExpense.rejected, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export const { clearExpenseError } = expenseSlice.actions;
export default expenseSlice.reducer;
