const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../Model/user.model');

async function registerUser(req, res) {

  const {username,email,password,fullname:{firstName,lastName}} = req.body

}

module.exports = { registerUser };
