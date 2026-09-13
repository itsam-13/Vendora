const mongoose = require('mongoose');
const dns = require('node:dns');

// Use Google Public DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function connectDB () {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        
    }
};

module.exports = connectDB;
