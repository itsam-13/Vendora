const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const userModel = require('../Model/user.model');
const redis = require('../DataBase/redis');

async function registerUser(req, res) {
  try {
    const { username, email, password, role } = req.body;
    const fullName = req.body.fullName || req.body.fullname || {};
    const { firstName, lastName } = fullName;

    const normalizedUsername = typeof username === 'string' ? username.toLowerCase() : username;
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase() : email;

    const isUserAlreadyExist = await userModel.findOne({
      $or: [
        { username: normalizedUsername }, { email: normalizedEmail }
      ]
    });

    if (isUserAlreadyExist) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    // Password Hashing for security purpose
    const hashedPassword = await bcrypt.hash(password, 10);

    // Creating user
    const user = await userModel.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      fullName: { firstName, lastName },
      role: role || 'user'
    });

    // Generating JWT Token
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'default_jwt_secret';
    const token = jwt.sign({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }, jwtSecret, { expiresIn: '1d' });

    // Setting Cookie to the response
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 // 1 day in milliseconds
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: {
          firstName: user.fullName.firstName,
          lastName: user.fullName.lastName
        }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
}

// Login User Controller

async function loginUser(req, res) {
  try {
    const { password } = req.body;
    const email = req.body.email ? req.body.email.toLowerCase() : undefined;
    const username = req.body.username ? req.body.username.toLowerCase() : undefined;

    // Find user by email OR username
    const user = await userModel.findOne(
      email ? { email } : { username }
    ).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare provided password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'default_jwt_secret';
    const token = jwt.sign({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    }, jwtSecret, { expiresIn: '1d' });

    // Set auth cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: {
          firstName: user.fullName.firstName,
          lastName: user.fullName.lastName
        }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}

async function getCurrentUser(req, res) {
  return res.status(200).json({
    message: "User fetched successfully",
    user: req.user
  });
}

async function logoutUser(req, res) {

  try {

    const token = req.cookies.token;

    if (token) {
      await redis.set(`blacklist:${token}`, "true", 'EX', 60 * 60 * 24);
    }

    // Clear the token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
}


async function getUserAddresses(req, res) {
  try {
    const id = req.user.id || req.user._id;
    const user = await userModel.findById(id).select('address');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Addresses fetched successfully',
      user
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}

async function addUserAddress(req, res) {
  try {
    const id = req.user.id || req.user._id;

    const { street, city, state, pin, pincode, phone, country } = req.body;
    const finalPin = pincode || pin || req.body.zipCode;
    let isDefault = req.body.isDefault === true || req.body.isDefault === 'true';

    // Fetch user first to check existing addresses
    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user has no existing addresses, the first address automatically becomes default
    if (!user.address || user.address.length === 0) {
      isDefault = true;
    }

    // If this address is set to default, unmark other addresses
    if (isDefault && user.address && user.address.length > 0) {
      user.address.forEach(addr => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      street,
      city,
      state,
      pincode: finalPin,
      zipCode: finalPin,
      phone,
      country: country || 'India',
      isDefault
    };

    user.address.push(newAddress);
    await user.save();

    const savedAddress = user.address[user.address.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Address added successfully',
      address: savedAddress,
      addresses: user.address
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}

async function deleteAddress(req, res) {
  try {
    const id = req.user.id || req.user._id;
    const { addressID } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressID)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID format'
      });
    }

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressIndex = user.address.findIndex(addr => addr._id.toString() === addressID);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    user.address.splice(addressIndex, 1);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      addresses: user.address
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}



module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getUserAddresses,
  addUserAddress,
  deleteAddress,
};
