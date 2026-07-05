import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Failed to set item in storage', e);
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('Failed to get item from storage', e);
      return null;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to remove item from storage', e);
    }
  },
};
