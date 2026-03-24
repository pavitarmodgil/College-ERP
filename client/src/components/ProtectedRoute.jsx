import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_ROUTES = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
}

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in → back to login
  if (!user) return <Navigate to="/" replace />

  // Wrong role → redirect to their own dashboard
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/'} replace />
  }

  return children
}
