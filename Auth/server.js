require('dotenv').config()
const app = require('./Src/app')
const connectDB = require('./Src/DataBase/db')


connectDB()

app.listen(3000,()=>{
    console.log('Server is running on port 3000')
})

