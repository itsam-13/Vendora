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

module.exports = { registerUser };
