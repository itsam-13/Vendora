require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const authRoutes = require('./Routes/auth.routes')

const app = express()

// MiddleWares
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/auth', authRoutes)
app.use('/api/auth', authRoutes)

module.exports = app;
