import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import ThemeToggle from '../components/ThemeToggle'
import { GraduationCap } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const captchaRef = useRef(null)

  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('') // masked email returned by API
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const ROLE_ROUTES = { ADMIN: '/admin', TEACHER: '/teacher', STUDENT: '/student' }

  async function handleLogin(e) {
    e.preventDefault()
    if (!captchaToken) {
      setError('Please complete the CAPTCHA')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', {
        identifier,
        password,
        captchaToken,
      })
      setEmail(data.email)
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
      captchaRef.current?.resetCaptcha()
      setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  async function handleOTP(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: identifier.includes('@') ? identifier : email,
        otp,
      })
      login(data.accessToken, data.user)
      if (data.user.mustResetPassword) {
        navigate('/reset-password')
      } else {
        navigate(ROLE_ROUTES[data.user.role] || '/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <GraduationCap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">College ERP</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">One portal for every role</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email or ID
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@uni.com or STU003 or TCH001"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-center">
                <HCaptcha
                  sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken('')}
                  ref={captchaRef}
                  theme="auto"
                />
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTP} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  OTP sent to <span className="font-medium text-gray-900 dark:text-white">{email}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Enter 6-digit code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="482910"
                  required
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setOtp(''); setError('') }}
                className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
