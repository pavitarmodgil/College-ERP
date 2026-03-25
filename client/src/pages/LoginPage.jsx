import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const isDev = import.meta.env.DEV

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const captchaRef = useRef(null)

  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(isDev ? 'dev-bypass' : '')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [maskedEmail, setMaskedEmail] = useState('')   // display only
  const [resolvedEmail, setResolvedEmail] = useState('') // real email for OTP verify
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const otpRefs = useRef([])

  const ROLE_ROUTES = { ADMIN: '/admin', TEACHER: '/teacher', STUDENT: '/student' }

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
      const { data } = await api.post('/auth/login', { identifier, password, captchaToken })
      setMaskedEmail(data.email)           // e.g. "ad***@uni.com" — shown in UI
      setResolvedEmail(data.lookupEmail)   // e.g. "admin@uni.com" — used for OTP lookup
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
    const otpString = otp.join('')
    if (otpString.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: resolvedEmail, // always the real email — works for both email and STU/TCH id logins
        otp: otpString,
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

  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  return (
    <main className="flex min-h-screen font-body bg-surface text-on-surface antialiased overflow-hidden">
      {/* Left Panel — Signature Gradient */}
      <section className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden bg-gradient-to-br from-[#3525cd] to-[#4f46e5]">
        {/* Decorative SVG geometry */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
            <circle cx="400" cy="400" r="300" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="400" cy="400" r="200" fill="none" stroke="white" strokeWidth="1" />
            <rect
              x="200" y="200" width="400" height="400"
              fill="none" stroke="white" strokeWidth="1"
              transform="rotate(45 400 400)"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 p-16 w-full max-w-2xl">
          <div className="mb-12">
            <h1 className="font-headline text-6xl font-extrabold text-white tracking-tight leading-tight">
              College ERP
            </h1>
            <p className="mt-4 text-on-primary-container text-xl font-medium opacity-90">
              One portal. Every role.
            </p>
          </div>

          {/* Glassmorphism Card */}
          <div
            className="p-8 rounded-xl shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">school</span>
              </div>
              <div>
                <div className="text-white font-headline font-bold">Academic Curator</div>
                <div className="text-on-primary-container text-xs tracking-wider uppercase font-label">
                  Institutional Excellence
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-on-primary-container w-3/4" />
              </div>
              <div className="flex justify-between text-xs text-on-primary-container font-medium">
                <span>Campus Digitization Progress</span>
                <span>75% Complete</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Panel — Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="font-headline text-3xl font-bold text-primary tracking-tight">
              College ERP
            </h1>
            <p className="text-on-surface-variant text-sm">One portal. Every role.</p>
          </div>

          <div className="bg-surface-container-lowest p-8 md:p-10 rounded-xl">
            <header className="mb-10">
              <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight mb-2">
                Welcome Back
              </h2>
              <p className="text-on-surface-variant font-body">
                Sign in to your curator dashboard
              </p>
            </header>

            {step === 'credentials' ? (
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Email / ID */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-on-surface-variant font-label px-1">
                    Email or Student ID
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm">
                      alternate_email
                    </span>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="curator@university.edu"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-surface-container-high border-0 rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline text-on-surface outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-sm font-semibold text-on-surface-variant font-label">
                      Password
                    </label>
                    <a className="text-xs font-bold text-primary hover:underline" href="#">
                      Forgot?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm">
                      lock
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-surface-container-high border-0 rounded-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline text-on-surface outline-none"
                    />
                  </div>
                </div>

                {/* CAPTCHA */}
                <div className="p-4 bg-surface-container-low rounded-lg flex items-center justify-between">
                  {isDev ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary rounded flex items-center justify-center bg-primary">
                          <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        </div>
                        <span className="text-sm font-medium text-on-surface-variant">I'm not a robot</span>
                      </div>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                        Dev Mode
                      </span>
                    </>
                  ) : (
                    <HCaptcha
                      sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                      onVerify={setCaptchaToken}
                      onExpire={() => setCaptchaToken('')}
                      ref={captchaRef}
                      theme="light"
                    />
                  )}
                </div>

                {error && (
                  <p className="text-sm text-error font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary-container text-on-primary font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Continue'}
                  {!loading && (
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOTP} className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-on-surface-variant">
                    OTP sent to{' '}
                    <span className="font-bold text-on-surface">{maskedEmail}</span>
                  </p>
                </div>

                {/* 6-box OTP input */}
                <div className="flex gap-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      className="w-full h-14 bg-surface-container-high border-0 rounded-lg text-center text-xl font-bold text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all outline-none"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-error font-medium text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-4 bg-primary-container text-on-primary font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setOtp(['', '', '', '', '', '']); setError('') }}
                  className="w-full py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  ← Back to login
                </button>
              </form>
            )}

            {/* OTP preview (step 1 greyed out) */}
            {step === 'credentials' && (
              <div className="mt-10 pt-8 border-t border-outline-variant/15">
                <div className="flex items-center gap-3 text-outline mb-4">
                  <span className="material-symbols-outlined text-lg">phonelink_lock</span>
                  <span className="text-xs font-bold font-label tracking-widest uppercase">
                    Secondary Verification
                  </span>
                </div>
                <div className="opacity-40 pointer-events-none">
                  <div className="flex gap-3 mb-4">
                    {Array(6).fill(0).map((_, i) => (
                      <div key={i} className="w-full h-12 bg-surface-container-high rounded-lg flex items-center justify-center text-outline-variant font-bold">
                        _
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant text-center">
                    OTP step will appear after initial sign-in
                  </p>
                </div>
              </div>
            )}
          </div>

          <footer className="mt-8 text-center">
            <p className="text-sm text-on-surface-variant">
              Trouble logging in?{' '}
              <a className="text-primary font-bold hover:underline" href="#">
                Contact ERP Support
              </a>
            </p>
          </footer>
        </div>
      </section>
    </main>
  )
}
