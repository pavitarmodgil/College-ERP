const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // only count FAILED attempts — successful logins don't count toward the limit
  message: { error: 'Too many failed login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  skipSuccessfulRequests: true, // only count failed OTP verifications
  message: { error: 'Too many OTP attempts. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { loginLimiter, otpLimiter }
