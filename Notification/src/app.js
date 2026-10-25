const express = require('express');
const { connect, subscribeToQueue } = require('./broker/broker')
const setListeners = require('./broker/listners')

const app = express();

connect().then(() => {
    setListeners()
})

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Notification service is up and running!');
});



module.exports = app;