const mongoose = require('mongoose');


const addSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    zipCode: String,
    pincode: String,
    phone: String,
    country: String,
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    fullName: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        }
    },
    role: {
        type: String,
        enum: ['user', 'seller'],
        default: 'user'
    },
    address: [addSchema]

})

const userModel = mongoose.model('User', userSchema);

module.exports = userModel