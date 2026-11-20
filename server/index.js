require('dotenv').config()
const app = require('./app')

// API_PORT first: local .env files may still carry an unrelated PORT value.
// PORT is the fallback that Railway/Render inject when API_PORT is not set.
const PORT = process.env.API_PORT || process.env.PORT || 4000
app.listen(PORT, () => console.log(`API server running on port ${PORT}`))
