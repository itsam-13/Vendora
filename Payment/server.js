require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/database/db');

connectDB();

app.listen(3004, () => {
    console.log('Payment Service is running on port 3004');
});