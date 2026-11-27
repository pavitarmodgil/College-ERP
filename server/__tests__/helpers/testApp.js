// API test harness.
//
// Boots the real Express app (routes + authGuard + controllers, unmodified)
// with in-memory fakes for Prisma, Redis and the mailer, so authorization and
// validation behaviour can be tested without a database, Redis or network.
//
// node --test runs every test file in its own process, so stubbing modules in
// require.cache at the top of a file cannot leak between files.

const http = require('node:http')
const path = require('node:path')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = 'test-access-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.NODE_ENV = 'test'

const SERVER_DIR = path.join(__dirname, '..', '..')

function stubModule(relPath, exports) {
  const resolved = require.resolve(path.join(SERVER_DIR, relPath))
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports }
}

// Any prisma.<model>.<method> a test did not stub throws, so an unexpected
// query (e.g. a write that should have been blocked) fails the test loudly.
function createFakePrisma() {
  const target = {
    $transaction: async (ops) => Promise.all(ops),
  }
  return new Proxy(target, {
    get(t, model) {
      if (model in t) return t[model]
      if (typeof model !== 'string' || model === 'then') return undefined
      t[model] = new Proxy({}, {
        get(m, method) {
          if (method in m) return m[method]
          if (typeof method !== 'string' || method === 'then') return undefined
          return async () => { throw new Error(`Unexpected prisma call: ${model}.${method}`) }
        },
      })
      return t[model]
    },
  })
}

function createFakeRedis() {
  const store = new Map()
  return {
    store,
    async get(key) { return store.has(key) ? store.get(key) : null },
    async set(key, value) { store.set(key, value); return 'OK' },
    async del(key) { return store.delete(key) ? 1 : 0 },
    on() {},
  }
}

// Controllers destructure mailer functions at require time, so tests can't
// swap the functions themselves — set `mailer.failWith = err` instead.
function createFakeMailer() {
  const mailer = {
    sent: [],
    failWith: null,
    async sendOtpEmail(to, otp) {
      if (mailer.failWith) throw mailer.failWith
      mailer.sent.push({ type: 'otp', to, otp })
    },
    async sendTempPasswordEmail(to, password) {
      if (mailer.failWith) throw mailer.failWith
      mailer.sent.push({ type: 'temp', to, password })
    },
  }
  return mailer
}

// Install fakes and boot the app on an ephemeral port.
async function setup() {
  const prisma = createFakePrisma()
  const redis = createFakeRedis()
  const mailer = createFakeMailer()
  stubModule('lib/prisma', prisma)
  stubModule('lib/redis', redis)
  stubModule('lib/mailer', mailer)

  const app = require(path.join(SERVER_DIR, 'app'))
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const { port } = server.address()

  function request(method, urlPath, { token, body } = {}) {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? null : JSON.stringify(body)
      const headers = {}
      if (payload) {
        headers['content-type'] = 'application/json'
        headers['content-length'] = Buffer.byteLength(payload)
      }
      if (token) headers.authorization = `Bearer ${token}`

      const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers }, (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          let json = null
          try { json = data ? JSON.parse(data) : null } catch { json = data }
          resolve({ status: res.statusCode, body: json })
        })
      })
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  }

  return {
    prisma,
    redis,
    mailer,
    request,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )
}

module.exports = { setup, tokenFor }
