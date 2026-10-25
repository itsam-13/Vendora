require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/database/db');
const { connect } = require('./src/broker/broker');

connectDB();
connect();

app.listen(3004, () => {
    console.log('Payment Service is running on port 3004');
});