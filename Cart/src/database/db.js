const mongoose = require('mongoose');
const dns = require('dns')

dns.setServers(['8.8.8.8', '8.8.4.4']);


async function connectDB() {

    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MongoDB connection URI is missing. Ensure MONGO_URI or MONGODB_URI is set in your .env file.");
        }
        await mongoose.connect(mongoUri);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
}

module.exports = { connectDB }