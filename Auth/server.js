require('dotenv').config()
const app = require('./Src/app')
const connectDB = require('./Src/DataBase/db')
const { connect } = require('../Auth/Src/broker/broker')


connectDB()
connect()

app.listen(3000,()=>{
    console.log('Server is running on port 3000')
})

