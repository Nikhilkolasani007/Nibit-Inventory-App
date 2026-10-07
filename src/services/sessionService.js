// src/services/sessionService.js - Persistent Mobile Session Management
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@nibit_user_session';
const DATA_CACHE_KEY = '@nibit_cached_data';

export const sessionService = {
  // Store user session on mobile device
  async saveSession(user, websiteUrl, token = null) {
    try {
      const sessionData = {
        user,
        websiteUrl,
        token: token || `token_${Date.now()}`,
        savedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      return sessionData;
    } catch (e) {
      console.warn('Failed to save session to AsyncStorage:', e);
      return null;
    }
  },

  // Retrieve stored mobile session
  async getSession() {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
      return null;
    } catch (e) {
      console.warn('Failed to read session:', e);
      return null;
    }
  },

  // Clear session on logout
  async clearSession() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      return true;
    } catch (e) {
      console.warn('Failed to clear session:', e);
      return false;
    }
  },

  // Cache extracted data
  async saveCache(data) {
    try {
      await AsyncStorage.setItem(DATA_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Cache save error:', e);
    }
  },

  // Read cached data
  async getCache() {
    try {
      const raw = await AsyncStorage.getItem(DATA_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
};

export default sessionService;
