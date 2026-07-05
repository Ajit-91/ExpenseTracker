import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import expenseReducer from './expenseSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
