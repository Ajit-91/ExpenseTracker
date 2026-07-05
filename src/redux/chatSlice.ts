import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from './authSlice';

export interface ChatMessage {
  _id?: string;
  sender: 'user' | 'model';
  text: string;
  createdAt?: string;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
};

const getAuthHeader = (getState: any) => {
  const token = getState().auth.token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const fetchChatHistory = createAsyncThunk(
  'chat/fetchHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/chat/history`, getAuthHeader(getState));
      return response.data.messages;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch history');
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async (message: string, { getState, rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/chat`, { message }, getAuthHeader(getState));
      return { userMsg: message, botMsg: response.data.message };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send message');
    }
  }
);

export const clearChatHistory = createAsyncThunk(
  'chat/clearHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/chat/history`, getAuthHeader(getState));
      return true;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to clear history');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Fetch History
    builder.addCase(fetchChatHistory.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchChatHistory.fulfilled, (state, action: PayloadAction<ChatMessage[]>) => {
      state.loading = false;
      state.messages = action.payload;
    });
    builder.addCase(fetchChatHistory.rejected, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Send Message
    builder.addCase(sendChatMessage.pending, (state, action) => {
      // Optimistic update for the user's message
      state.loading = true;
      state.error = null;
      state.messages.push({ sender: 'user', text: action.meta.arg });
    });
    builder.addCase(sendChatMessage.fulfilled, (state, action: PayloadAction<{ userMsg: string; botMsg: string }>) => {
      state.loading = false;
      // Remove the optimistic message because we might want to refresh from backend, 
      // or simply push the bot response. Since we already pushed userMsg, let's just push the botMsg.
      state.messages.push({ sender: 'model', text: action.payload.botMsg });
    });
    builder.addCase(sendChatMessage.rejected, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.error = action.payload;
      // Optionally add a system failure warning to the chat list
      state.messages.push({ sender: 'model', text: 'Error: Failed to deliver message. Check backend connectivity.' });
    });

    // Clear History
    builder.addCase(clearChatHistory.fulfilled, (state) => {
      state.messages = [];
    });
  },
});

export default chatSlice.reducer;
