import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const ROLE_HOME = { ADMIN: '/admin', TEACHER: '/teacher', STUDENT: '/student' }

export default function ResetPasswordPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email: user.email, newPassword })
      // Token is still valid — go straight to dashboard, no need to re-login
      navigate(ROLE_HOME[user?.role] || '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock_reset
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Set your password</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Choose a new password to continue.
          </p>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-on-surface-variant font-label px-1">
                New Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm">
                  lock
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="w-full pl-11 pr-4 py-3.5 bg-surface-container-high border-0 rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-on-surface-variant font-label px-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm">
                  lock_clock
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-surface-container-high border-0 rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline text-on-surface outline-none"
                />
              </div>
            </div>

            {error && <p className="text-sm text-error font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary-container text-on-primary font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
