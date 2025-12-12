require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

app.use(express.json())

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}
app.use(cors(corsOptions))

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/tasks', require('./routes/tasks'))

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
