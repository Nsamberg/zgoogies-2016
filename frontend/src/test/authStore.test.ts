import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../stores/authStore'

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  surname: 'User',
  is_admin: false,
  is_cachier: false,
  has_paid: true,
  timezone: 'UTC',
  tournament_winner_id: null,
}

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isInitializing: true,
    })
  })

  it('starts with no user and isInitializing=true', () => {
    const { user, isAuthenticated, isInitializing } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
    expect(isInitializing).toBe(true)
  })

  it('setUser sets user and isAuthenticated=true', () => {
    useAuthStore.getState().setUser(mockUser)
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toEqual(mockUser)
    expect(isAuthenticated).toBe(true)
  })

  it('setUser with null clears user and sets isAuthenticated=false', () => {
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().setUser(null)
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('setInitialized sets isInitializing=false', () => {
    useAuthStore.getState().setInitialized()
    expect(useAuthStore.getState().isInitializing).toBe(false)
  })

  it('logout clears user and sets isAuthenticated=false', () => {
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().logout()
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
  })

  it('stores admin flag correctly', () => {
    const adminUser = { ...mockUser, is_admin: true }
    useAuthStore.getState().setUser(adminUser)
    expect(useAuthStore.getState().user?.is_admin).toBe(true)
  })

  it('stores cachier flag correctly', () => {
    const cashierUser = { ...mockUser, is_cachier: true }
    useAuthStore.getState().setUser(cashierUser)
    expect(useAuthStore.getState().user?.is_cachier).toBe(true)
  })
})
