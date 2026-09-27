require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/database/db');


connectDB()

app.listen(3002, () => {
    console.log("Cart server running on port 3002");
})

