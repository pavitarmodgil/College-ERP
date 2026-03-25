import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('accessToken'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Parse user from stored token on app load
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        // Check expiry
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.id, email: payload.email, role: payload.role })
        } else {
          localStorage.removeItem('accessToken')
          setToken(null)
        }
      } catch {
        localStorage.removeItem('accessToken')
        setToken(null)
      }
    }
    setLoading(false)
  }, [token])

  function login(accessToken, userData) {
    localStorage.setItem('accessToken', accessToken)
    setToken(accessToken)
    setUser(userData)
  }

  async function logout() {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      localStorage.removeItem('accessToken')
      setToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
