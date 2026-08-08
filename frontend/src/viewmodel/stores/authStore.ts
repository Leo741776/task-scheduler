import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser } from '../../model/services/authApi';
import { useTaskStore } from './taskStore';
import { useFolderStore } from './folderStore';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: async (username, password) => {
        const { token, user } = await loginUser({ username, password });
        set({
          user: user as User,
          token,
        });
      },

      register: async (payload) => {
        // Account creation only. The user lands back on the login screen
        // and signs in there. Auth state is not set here.
        await registerUser(payload);
      },

      logout: () => {
        set({ token: null, user: null });
        // Clear loaded user-specific working state. Task placements are
        // intentionally preserved so the same user gets their calendar
        // placement back on next login.
        useTaskStore.getState().clear();
        useFolderStore.getState().clear();
      },

      initializeAuth: () => {
        // Persist middleware rehydrates token + user from AsyncStorage on store
        // creation; this method exists as an explicit call site for app-start
        // token validation once the backend issues JWTs.
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
