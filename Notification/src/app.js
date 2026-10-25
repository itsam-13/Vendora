const express = require('express');
const { connect } = require('./broker/broker')

const app = express();

connect();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Notification service is up and running!');
});



module.exports = app;