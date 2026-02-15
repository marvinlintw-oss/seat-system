// src/store/useAuthStore.ts
import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (id: string, pw: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false, // 開發時可設為 true 跳過登入
  login: (id, pw) => {
    // Mock Auth
    if (id === 'tier' && pw === '25865000') {
      set({
        isAuthenticated: true,
        user: { id: 'admin-1', username: 'Protocol Officer', role: 'admin' },
      });
      return true;
    }
    return false;
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));