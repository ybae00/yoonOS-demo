import { create } from 'zustand';
import { UserProfile, UserSettings } from '@/types';

type AuthStore = {
  userId: string | null;
  userEmail: string | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  setUser: (userId: string, email: string, profile: UserProfile, settings: UserSettings) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  userEmail: null,
  profile: null,
  settings: null,
  setUser: (userId, userEmail, profile, settings) =>
    set({ userId, userEmail, profile, settings }),
  updateSettings: (partial) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...partial } : null,
    })),
  updateProfile: (partial) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : null,
    })),
  clearUser: () => set({ userId: null, userEmail: null, profile: null, settings: null }),
}));
