const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../Model/user.model');

async function registerUser(req, res) {
  try {
    const { username, email, password } = req.body;
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
      fullName: {
        firstName,
        lastName
      }
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


module.exports = { registerUser, loginUser, getCurrentUser };
