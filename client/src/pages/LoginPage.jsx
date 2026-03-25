import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import ThemeToggle from '../components/ThemeToggle'
import { GraduationCap, ClipboardList, BarChart3, Shield } from 'lucide-react'

const isDev = import.meta.env.DEV

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const captchaRef = useRef(null)

  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(isDev ? 'dev-bypass' : '')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('') // masked email returned by API
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const ROLE_ROUTES = { ADMIN: '/admin', TEACHER: '/teacher', STUDENT: '/student' }

  // In dev mode, auto-set bypass token
  useEffect(() => {
    if (isDev) setCaptchaToken('dev-bypass')
  }, [])

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
      if (!isDev) {
        captchaRef.current?.resetCaptcha()
        setCaptchaToken('')
      }
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

  const features = [
    { icon: ClipboardList, text: 'Attendance tracking' },
    { icon: BarChart3, text: 'Grade management' },
    { icon: Shield, text: 'Role-based access' },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Theme toggle — fixed top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#3525cd] to-indigo-600">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-16 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
          <GraduationCap size={48} className="text-white mb-6" />
          <h1 className="text-5xl font-extrabold text-white tracking-tight">College ERP</h1>
          <p className="text-indigo-200 mt-3 text-lg">One portal. Every role.</p>

          {/* Glassmorphism feature card */}
          <div className="mt-12 w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <div className="space-y-4">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Icon size={16} className="text-white" />
                  </div>
                  <span className="text-white/90 text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile-only branding header */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <GraduationCap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">College ERP</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">One portal. Every role.</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full ${step === 'credentials' ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {step === 'credentials' ? '1' : '2'} of 2
            </span>
            <div className={`w-2 h-2 rounded-full ${step === 'otp' ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {/* CAPTCHA area */}
                <div className="flex justify-center">
                  {isDev ? (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full">
                      CAPTCHA bypassed (dev mode)
                    </span>
                  ) : (
                    <HCaptcha
                      sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                      onVerify={setCaptchaToken}
                      onExpire={() => setCaptchaToken('')}
                      ref={captchaRef}
                      theme="auto"
                    />
                  )}
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25"
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
                    placeholder="000000"
                    required
                    maxLength={6}
                    autoFocus
                    className="w-full px-3 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center tracking-[0.5em] text-2xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25"
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
    </div>
  )
}
