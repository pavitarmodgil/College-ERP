// CRIT-1 (reset-password must act only on the authenticated caller) and
// CRIT-4 (a failed OTP email must not report success or leave a live code).

const { test, before, after, beforeEach, mock } = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const { setup, tokenFor } = require('./helpers/testApp')

let ctx
let currentHash
const student = { id: 7, email: 'student@example.edu', role: 'STUDENT' }

before(async () => {
  ctx = await setup()
  currentHash = await bcrypt.hash('old-password-1', 4)
})
after(() => ctx.close())

beforeEach(() => {
  ctx.prisma.user.update = async () => { throw new Error('update should not be called') }
})

test('reset-password: unauthenticated request is rejected and changes nothing', async () => {
  const res = await ctx.request('POST', '/api/auth/reset-password', {
    body: { email: 'admin@example.edu', newPassword: 'hijacked-password' },
  })
  assert.equal(res.status, 401)
})

test('reset-password: forced reset updates the token owner, never the email in the body', async () => {
  ctx.prisma.user.findUnique = async ({ where }) => {
    assert.deepEqual(where, { id: student.id })
    return { id: student.id, password: currentHash, isActive: true, mustResetPassword: true }
  }
  let updateArgs = null
  ctx.prisma.user.update = async (args) => { updateArgs = args; return {} }

  const res = await ctx.request('POST', '/api/auth/reset-password', {
    token: tokenFor(student),
    body: { email: 'admin@example.edu', newPassword: 'brand-new-password' },
  })

  assert.equal(res.status, 200)
  assert.deepEqual(updateArgs.where, { id: student.id })
  assert.equal(updateArgs.data.mustResetPassword, false)
  assert.ok(await bcrypt.compare('brand-new-password', updateArgs.data.password))
})

test('reset-password: without the forced-reset flag, currentPassword is required', async () => {
  ctx.prisma.user.findUnique = async () =>
    ({ id: student.id, password: currentHash, isActive: true, mustResetPassword: false })

  const res = await ctx.request('POST', '/api/auth/reset-password', {
    token: tokenFor(student),
    body: { newPassword: 'brand-new-password' },
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /currentPassword/)
})

test('reset-password: wrong currentPassword is refused with 403', async () => {
  ctx.prisma.user.findUnique = async () =>
    ({ id: student.id, password: currentHash, isActive: true, mustResetPassword: false })

  const res = await ctx.request('POST', '/api/auth/reset-password', {
    token: tokenFor(student),
    body: { newPassword: 'brand-new-password', currentPassword: 'not-it' },
  })
  assert.equal(res.status, 403)
})

test('reset-password: correct currentPassword allows a normal change', async () => {
  ctx.prisma.user.findUnique = async () =>
    ({ id: student.id, password: currentHash, isActive: true, mustResetPassword: false })
  let updated = false
  ctx.prisma.user.update = async () => { updated = true; return {} }

  const res = await ctx.request('POST', '/api/auth/reset-password', {
    token: tokenFor(student),
    body: { newPassword: 'brand-new-password', currentPassword: 'old-password-1' },
  })
  assert.equal(res.status, 200)
  assert.equal(updated, true)
})

test('reset-password: rejects reusing the current password', async () => {
  ctx.prisma.user.findUnique = async () =>
    ({ id: student.id, password: currentHash, isActive: true, mustResetPassword: true })

  const res = await ctx.request('POST', '/api/auth/reset-password', {
    token: tokenFor(student),
    body: { newPassword: 'old-password-1' },
  })
  assert.equal(res.status, 400)
})

test('reset-password: deactivated account is refused', async () => {
  ctx.prisma.user.findUnique = async () =>
    ({ id: student.id, password: currentHash, isActive: false, mustResetPassword: true })

  const res = await ctx.request('POST', '/api/auth/reset-password', {
    token: tokenFor(student),
    body: { newPassword: 'brand-new-password' },
  })
  assert.equal(res.status, 403)
})

test('reset-password: rejects short, overlong and non-string passwords', async () => {
  for (const newPassword of ['short', 'x'.repeat(73), 12345678, null]) {
    const res = await ctx.request('POST', '/api/auth/reset-password', {
      token: tokenFor(student),
      body: { newPassword },
    })
    assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(newPassword)}`)
  }
})

test('login: non-string identifier is a 400, not a crash', async () => {
  const res = await ctx.request('POST', '/api/auth/login', {
    body: { identifier: { $gt: '' }, password: 'x', captchaToken: 'x' },
  })
  assert.equal(res.status, 400)
})

test('login: failed OTP email returns 502 and discards the stored code', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => ({ json: async () => ({ success: true }) }))
  ctx.prisma.user.findUnique = async () => ({
    id: student.id,
    email: student.email,
    password: currentHash,
    isActive: true,
    mustResetPassword: false,
  })
  const mailErr = new Error('We could not send the verification email. Please try again shortly.')
  mailErr.status = 502
  ctx.mailer.failWith = mailErr

  try {
    const res = await ctx.request('POST', '/api/auth/login', {
      body: { identifier: student.email, password: 'old-password-1', captchaToken: 'token' },
    })
    assert.equal(res.status, 502)
    assert.equal(await ctx.redis.get(`otp:${student.email}`), null)
  } finally {
    ctx.mailer.failWith = null
    fetchMock.mock.restore()
  }
})
