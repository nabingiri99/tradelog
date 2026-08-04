const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};

  const errors = [];
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Name is required.');
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('Enter a valid email address.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token: signToken(user._id),
    data: user,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (!user || !(await user.matchPassword(String(password)))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  res.json({
    success: true,
    message: 'Logged in successfully',
    token: signToken(user._id),
    data: user,
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Name is required.',
    });
  }

  req.user.name = name.trim();
  await req.user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: req.user,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password is required.',
    });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters.',
    });
  }

  if (!(await req.user.matchPassword(currentPassword))) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect.',
    });
  }

  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

module.exports = { register, login, getMe, updateProfile, changePassword };
