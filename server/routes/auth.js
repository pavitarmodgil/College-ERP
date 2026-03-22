const express = require('express')
const router = express.Router()
const { login, verifyOTP, refresh, logout, resetPassword } = require('../controllers/authController')
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter')
const { authGuard } = require('../middleware/authGuard')

router.post('/login', loginLimiter, login)
router.post('/verify-otp', otpLimiter, verifyOTP)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.post('/reset-password', resetPassword)

// Test route — verifies authGuard is working (Step 15, Test 4)
router.get('/me', authGuard, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router
