// Express application — middleware stack + route mounting.
//
// WHY this lives apart from index.js: tests import the app and drive it over
// an ephemeral port without opening the real listener, and without index.js
// side effects. index.js only loads env and calls listen().

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const courseRoutes = require('./routes/courses')
const attendanceRoutes = require('./routes/attendance')
const gradeRoutes = require('./routes/grades')
const announcementRoutes = require('./routes/announcements')
const timetableRoutes = require('./routes/timetable')
const assessmentRoutes = require('./routes/assessments')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Trust Railway/Render/Vercel reverse proxy — required for rate-limiter IP detection
app.set('trust proxy', 1)

// Security middleware — always first
app.use(helmet())
app.use(cors({
  origin: (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/$/, ''),
  credentials: true, // required for cookies to work cross-origin
}))

// Body parsing
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/timetable', timetableRoutes)
app.use('/api/assessments', assessmentRoutes)

// Health check — useful for deployment later
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Error handler — always last
app.use(errorHandler)

module.exports = app
