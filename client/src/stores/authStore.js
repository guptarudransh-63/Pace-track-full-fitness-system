import { create } from 'zustand';
import { api } from '../services/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  unitPreference: 'metric',

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const data = await api.getCurrentUser();
      set({
        user: data.user,
        isAuthenticated: true,
        unitPreference: data.user.unitPreference || 'metric',
        isLoading: false,
      });
      return data.user;
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  },

  login: async (emailOrUsername, password) => {
    const data = await api.login({ emailOrUsername, password });
    set({
      user: data.user,
      isAuthenticated: true,
      unitPreference: data.user.unitPreference || 'metric',
    });
    return data.user;
  },

  register: async (name, username, email, password) => {
    const data = await api.register({ name, username, email, password });
    set({
      user: data.user,
      isAuthenticated: true,
      unitPreference: data.user.unitPreference || 'metric',
    });
    return data.user;
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    set({ user: null, isAuthenticated: false });
  },

  setUnitPreference: async (unitPreference) => {
    set({ unitPreference });
    if (get().isAuthenticated) {
      try {
        await api.updatePreferences({ unitPreference });
      } catch {
        // ignore
      }
    }
  },

  updateUser: (updatedFields) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
      unitPreference: updatedFields.unitPreference || state.unitPreference,
    }));
  },
}));
