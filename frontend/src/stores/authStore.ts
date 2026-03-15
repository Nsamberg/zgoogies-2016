import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  setUser: (user: User | null) => void
  setInitialized: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setInitialized: () => set({ isInitializing: false }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
