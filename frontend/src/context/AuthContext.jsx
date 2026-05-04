import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin } from '../api/auth.ts'

const AuthContext = createContext({ user: null, login: async () => {}, logout: () => {} })

const STORAGE_KEY = 'ra-user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = async (username) => {
    const userData = await apiLogin(username)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
