import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  datetimeOffsetMs: number | null
  setUser: (user: User | null) => void
  setInitialized: () => void
  setDatetimeOffset: (offsetMs: number | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  datetimeOffsetMs: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setInitialized: () => set({ isInitializing: false }),
  setDatetimeOffset: (offsetMs) => set({ datetimeOffsetMs: offsetMs }),
  logout: () => set({ user: null, isAuthenticated: false, datetimeOffsetMs: null }),
}))
