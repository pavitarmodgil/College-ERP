// Transactional email via the Resend HTTP API (Railway blocks SMTP ports).
//
// Two rules this module enforces:
//  1. Secrets (OTPs, temporary passwords) are printed to the console ONLY when
//     NODE_ENV === 'development', so local logins work without a verified
//     sending domain. Production logs never contain them.
//  2. Delivery failures are surfaced. resend.emails.send() reports failure as
//     a returned { error } rather than a throw; outside development that becomes
//     a 502 the caller must handle, so the API never claims "OTP sent" falsely.

const { Resend } = require('resend')

// Resend's shared sandbox sender only delivers to the Resend account owner's
// own address. Real users need MAIL_FROM on a domain verified in Resend.
const SANDBOX_FROM = 'College ERP <onboarding@resend.dev>'

const isDevelopment = () => process.env.NODE_ENV === 'development'

if (process.env.NODE_ENV === 'production' && !process.env.MAIL_FROM) {
  console.warn('[MAIL] MAIL_FROM is not set — using the Resend sandbox sender, which only delivers to the account owner.')
}

let client = null
function getClient() {
  if (!process.env.RESEND_API_KEY) return null
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

function maskEmail(email) {
  const [local = '', domain = ''] = String(email).split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function deliveryError(message) {
  const err = new Error(message)
  err.status = 502
  return err
}

async function deliver({ to, subject, html, devSecret }) {
  if (isDevelopment()) {
    console.log(`\n[MAIL:dev] To: ${to} | ${devSecret}\n`)
  }

  const resend = getClient()
  if (!resend) {
    if (isDevelopment()) return { delivered: false }
    throw deliveryError('Email service is not configured.')
  }

  let result
  try {
    result = await resend.emails.send({ from: process.env.MAIL_FROM || SANDBOX_FROM, to, subject, html })
  } catch (err) {
    result = { error: { name: err.name, message: err.message } }
  }

  if (result?.error) {
    console.error(`[MAIL] Delivery to ${maskEmail(to)} failed: ${result.error.name || 'error'} — ${result.error.message || 'unknown'}`)
    // In development the code is already in the console, so login can proceed.
    if (isDevelopment()) return { delivered: false }
    throw deliveryError('We could not send the email. Please try again shortly.')
  }

  console.log(`[MAIL] Sent "${subject}" to ${maskEmail(to)} (id ${result?.data?.id || 'n/a'})`)
  return { delivered: true, id: result?.data?.id }
}

async function sendOtpEmail(toEmail, otp) {
  if (!/^\d{6}$/.test(String(otp))) throw new Error('sendOtpEmail expects a 6-digit code')
  return deliver({
    to: toEmail,
    subject: 'Your login verification code',
    devSecret: `OTP: ${otp}`,
    html: `<div style="font-family:sans-serif;max-width:400px">
             <h2>Login Verification</h2>
             <p>Your one-time password is:</p>
             <h1 style="letter-spacing:8px;color:#4F46E5">${otp}</h1>
             <p>Expires in <strong>5 minutes</strong>. If you didn't try to sign in, you can ignore this email.</p>
           </div>`,
  })
}

async function sendTempPasswordEmail(toEmail, tempPassword) {
  return deliver({
    to: toEmail,
    subject: 'Password Reset — College ERP',
    devSecret: `Temporary password: ${tempPassword}`,
    html: `<div style="font-family:sans-serif;max-width:400px">
             <h2>Password Reset</h2>
             <p>An administrator reset your password. Your temporary password is:</p>
             <p style="font-family:monospace;font-size:18px">${escapeHtml(tempPassword)}</p>
             <p>You will be asked to set a new password the next time you sign in.</p>
           </div>`,
  })
}

module.exports = { sendOtpEmail, sendTempPasswordEmail, maskEmail }
