require('dotenv').config()
const app = require("./src/app")


const { connect } = require("./src/broker/broker")
const connectDB = require("./src/database/db")
const listener = require("./src/broker/listener")



connectDB()

connect().then(() => {
    listener()
})

app.listen(process.env.PORT, () => {
    console.log("Seller Dashboard is running at 3007")
})