import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { storage } from '../utils/storage.ts';

// Default API URL (loaded from env)
export const API_URL = process.env.API_URL || 'http://localhost:5000/api';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  userId: null,
  email: null,
  loading: false,
  error: null,
};

export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, credentials);
      if (response.data?.token) {
        await storage.setItem('user_session', JSON.stringify({
          token: response.data.token,
          userId: response.data.userId,
          email: response.data.email
        }));
      }
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      if (response.data?.token) {
        await storage.setItem('user_session', JSON.stringify({
          token: response.data.token,
          userId: response.data.userId,
          email: response.data.email
        }));
      }
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    restoreSession: (
      state,
      action: PayloadAction<{ token: string; userId: string; email: string }>
    ) => {
      state.token = action.payload.token;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
    },
    logout: (state) => {
      state.token = null;
      state.userId = null;
      state.email = null;
      state.error = null;
      storage.removeItem('user_session');
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.token = action.payload.token;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
    });
    builder.addCase(registerUser.rejected, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.token = action.payload.token;
      state.userId = action.payload.userId;
      state.email = action.payload.email;
    });
    builder.addCase(loginUser.rejected, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export const { restoreSession, logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
