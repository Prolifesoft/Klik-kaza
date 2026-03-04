import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  level: number;
  total_credits: number;
  available_credits: number;
  daily_click_limit: number;
  tron_wallet: string | null;
  referral_code: string | null;
  kyc_status: 'unverified' | 'pending' | 'approved' | 'rejected';
  total_clicks: number;
  today_clicks?: number;
  level_info?: {
    level: number;
    name: string;
    required_clicks: number;
    multiplier: number;
    bonus_limit: number;
  };
  next_level_info?: {
    level: number;
    name: string;
    required_clicks: number;
    multiplier: number;
    bonus_limit: number;
  } | null;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
