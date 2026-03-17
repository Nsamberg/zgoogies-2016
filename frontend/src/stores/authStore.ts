import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  systemDateOverride: string | null
  setUser: (user: User | null) => void
  setInitialized: () => void
  setSystemDateOverride: (override: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  systemDateOverride: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setInitialized: () => set({ isInitializing: false }),
  setSystemDateOverride: (override) => set({ systemDateOverride: override }),
  logout: () => set({ user: null, isAuthenticated: false, systemDateOverride: null }),
}))
