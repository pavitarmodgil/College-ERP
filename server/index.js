require('dotenv').config()
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

// Health check — useful for deployment later
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Error handler — always last
app.use(errorHandler)

const PORT = process.env.API_PORT || 4000
app.listen(PORT, () => console.log(`API server running on port ${PORT}`))
