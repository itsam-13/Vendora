const express = require('express')
const cookieParser = require('cookie-parser')





const app = express()

//MiddleWares

app.use(express.json())
app.use(cookieParser())






module.exports = app;