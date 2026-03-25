const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../lib/prisma')
const redis = require('../lib/redis')
const { sendOTPEmail } = require('../lib/mailer')

// Helper: detect identifier type and find user
async function findUserByIdentifier(identifier) {
  if (identifier.toUpperCase().startsWith('STU')) {
    return prisma.user.findUnique({ where: { studentId: identifier.toUpperCase() } })
  }
  if (identifier.toUpperCase().startsWith('TCH')) {
    return prisma.user.findUnique({ where: { teacherId: identifier.toUpperCase() } })
  }
  if (identifier.includes('@')) {
    return prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
  }
  return null
}

// Helper: generate tokens
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /auth/login
// Accepts identifier + password + captcha, verifies all three, sends OTP
async function login(req, res, next) {
  try {
    const { identifier, password, captchaToken } = req.body

    if (!identifier || !password || !captchaToken) {
      return res.status(400).json({ error: 'identifier, password and captchaToken are required' })
    }

    // 1. Verify hCaptcha (skip in development with bypass token)
    const isDevBypass = process.env.NODE_ENV === 'development' && captchaToken === 'dev-bypass'
    if (!isDevBypass) {
      const captchaRes = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.HCAPTCHA_SECRET}&response=${captchaToken}`,
      })
      const captchaData = await captchaRes.json()
      if (!captchaData.success) {
        return res.status(400).json({ error: 'CAPTCHA verification failed' })
      }
    }

    // 2. Find user
    const user = await findUserByIdentifier(identifier)
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // 3. Check password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // 4. Generate OTP, store in Redis with 5 min TTL
    const otp = crypto.randomInt(100000, 999999).toString()
    await redis.set(`otp:${user.email}`, otp, 'EX', 300)

    // 5. Email the OTP
    await sendOTPEmail(user.email, otp)

    // 6. Return only what's needed — never return the user object directly
    // lookupEmail is the real email (needed for OTP verify when user logged in with STU/TCH id)
    res.json({
      message: 'OTP sent to your registered email',
      email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // masked — display only
      lookupEmail: user.email,                                // real email — used for /verify-otp
      mustResetPassword: user.mustResetPassword,
    })
  } catch (err) {
    next(err)
  }
}

// POST /auth/verify-otp
// Verifies OTP, issues JWT access token + refresh token cookie
async function verifyOTP(req, res, next) {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ error: 'email and otp are required' })
    }

    // 1. Check OTP in Redis
    const storedOTP = await redis.get(`otp:${email}`)
    if (!storedOTP || storedOTP !== otp) {
      return res.status(401).json({ error: 'Invalid or expired OTP' })
    }

    // 2. Delete OTP immediately after use (one-time use)
    await redis.del(`otp:${email}`)

    // 3. Get fresh user from DB
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' })
    }

    // 4. Issue tokens
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    // 5. Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,       // JS cannot read this
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    })

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        teacherId: user.teacherId,
        mustResetPassword: user.mustResetPassword,
      },
    })
  } catch (err) {
    next(err)
  }
}

// POST /auth/refresh
// Silently issues new access token using refresh cookie
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' })
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' })
    }

    const accessToken = generateAccessToken(user)
    res.json({ accessToken })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
}

// POST /auth/logout
// Clears the refresh token cookie
async function logout(req, res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
  res.json({ message: 'Logged out' })
}

// POST /auth/reset-password
// For mustResetPassword users — forces new password before full access
async function resetPassword(req, res, next) {
  try {
    const { email, newPassword } = req.body

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'email and newPassword are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        mustResetPassword: false,
      },
    })

    res.json({ message: 'Password updated. Please log in again.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { login, verifyOTP, refresh, logout, resetPassword }
