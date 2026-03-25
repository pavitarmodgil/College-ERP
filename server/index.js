require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const authRoutes = require('./routes/auth')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Security middleware — always first
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite default port
  credentials: true, // required for cookies to work cross-origin
}))

// Body parsing
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)

// Health check — useful for deployment later
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Error handler — always last
app.use(errorHandler)

const PORT = process.env.API_PORT || 4000
app.listen(PORT, () => console.log(`API server running on port ${PORT}`))
