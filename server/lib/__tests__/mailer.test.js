// CRIT-3 (no OTPs/passwords in production logs) and CRIT-4 (delivery failures
// must surface instead of being silently ignored).

const { test, beforeEach, afterEach, mock } = require('node:test')
const assert = require('node:assert/strict')

// Replace the Resend SDK before mailer.js loads it.
let sendImpl = async () => ({ data: { id: 'msg_1' }, error: null })
let lastSendArgs = null
class FakeResend {
  constructor() {
    this.emails = {
      send: (args) => { lastSendArgs = args; return sendImpl(args) },
    }
  }
}
const resendPath = require.resolve('resend')
require.cache[resendPath] = { id: resendPath, filename: resendPath, loaded: true, exports: { Resend: FakeResend } }

process.env.RESEND_API_KEY = 're_test_key'
const { sendOtpEmail, sendTempPasswordEmail } = require('../mailer')

const ORIGINAL_ENV = process.env.NODE_ENV
let logged

beforeEach(() => {
  logged = []
  const capture = (...args) => { logged.push(args.join(' ')) }
  mock.method(console, 'log', capture)
  mock.method(console, 'error', capture)
  mock.method(console, 'warn', capture)
  sendImpl = async () => ({ data: { id: 'msg_1' }, error: null })
  lastSendArgs = null
})

afterEach(() => {
  mock.restoreAll()
  process.env.NODE_ENV = ORIGINAL_ENV
})

const allLogs = () => logged.join('\n')

test('production: a successful send never logs the code or the full address', async () => {
  process.env.NODE_ENV = 'production'
  const result = await sendOtpEmail('student@example.edu', '482913')
  assert.equal(result.delivered, true)
  assert.doesNotMatch(allLogs(), /482913/)
  assert.doesNotMatch(allLogs(), /student@example\.edu/)
})

test('production: a returned { error } becomes a 502 and the code is not logged', async () => {
  process.env.NODE_ENV = 'production'
  sendImpl = async () => ({ data: null, error: { name: 'validation_error', message: 'domain not verified' } })
  await assert.rejects(sendOtpEmail('student@example.edu', '482913'), (err) => err.status === 502)
  assert.doesNotMatch(allLogs(), /482913/)
})

test('production: a thrown network error also becomes a 502', async () => {
  process.env.NODE_ENV = 'production'
  sendImpl = async () => { throw new Error('ECONNRESET') }
  await assert.rejects(sendOtpEmail('student@example.edu', '482913'), (err) => err.status === 502)
})

test('production: temporary passwords are never logged', async () => {
  process.env.NODE_ENV = 'production'
  await sendTempPasswordEmail('teacher@example.edu', 'Tmp-Secret-123A1!')
  assert.doesNotMatch(allLogs(), /Tmp-Secret-123A1!/)
})

test('development: the code is printed so local logins work, and failures do not block', async () => {
  process.env.NODE_ENV = 'development'
  sendImpl = async () => ({ data: null, error: { name: 'validation_error', message: 'sandbox sender' } })
  const result = await sendOtpEmail('student@example.edu', '482913')
  assert.equal(result.delivered, false)
  assert.match(allLogs(), /482913/)
})

test('temporary password is HTML-escaped in the email body', async () => {
  process.env.NODE_ENV = 'production'
  await sendTempPasswordEmail('teacher@example.edu', '<b>x</b>')
  assert.match(lastSendArgs.html, /&lt;b&gt;x&lt;\/b&gt;/)
  assert.doesNotMatch(lastSendArgs.html, /<b>x<\/b>/)
})

test('MAIL_FROM overrides the sandbox sender', async () => {
  process.env.NODE_ENV = 'production'
  process.env.MAIL_FROM = 'Academic Curator <no-reply@example.edu>'
  try {
    await sendOtpEmail('student@example.edu', '482913')
    assert.equal(lastSendArgs.from, 'Academic Curator <no-reply@example.edu>')
  } finally {
    delete process.env.MAIL_FROM
  }
})

test('sendOtpEmail refuses anything but a 6-digit code', async () => {
  await assert.rejects(sendOtpEmail('student@example.edu', '12345'))
})
