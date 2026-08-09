const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendMail, randomToken, hashToken } = require('../utils/mailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30;

async function issueTokens(user) {
  const accessToken = signAccessToken(user._id);
  const refreshToken = randomToken();
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpires = new Date(Date.now() + REFRESH_TTL_MS);
  await user.save();
  return { accessToken, refreshToken };
}

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
  const verificationToken = randomToken();
  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    emailVerified: false,
    verificationToken: hashToken(verificationToken),
    verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  await sendMail({
    to: cleanEmail,
    subject: 'Verify your TradeLog email',
    html: `<p>Hi ${user.name},</p>
      <p>Verify your email to finish creating your account:</p>
      <p><a href="${APP_BASE_URL}/verify-email?token=${verificationToken}">Verify email</a></p>
      <p>This link expires in 24 hours.</p>`,
  });

  const tokens = await issueTokens(user);

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Check your email to verify it.',
    ...tokens,
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

  const tokens = await issueTokens(user);

  res.json({
    success: true,
    message: 'Logged in successfully',
    ...tokens,
    data: user,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required.',
    });
  }

  const hash = hashToken(refreshToken);
  const user = await User.findOne({
    refreshTokenHash: hash,
    refreshTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.',
    });
  }

  const tokens = await issueTokens(user);

  res.json({
    success: true,
    ...tokens,
    data: user,
  });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshTokenHash = undefined;
    req.user.refreshTokenExpires = undefined;
    await req.user.save();
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required.',
    });
  }

  const hash = hashToken(token);
  const user = await User.findOne({
    verificationToken: hash,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token.',
    });
  }

  user.emailVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = req.user;
  const verificationToken = randomToken();
  user.verificationToken = hashToken(verificationToken);
  user.verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await user.save();

  await sendMail({
    to: user.email,
    subject: 'Verify your TradeLog email',
    html: `<p>Hi ${user.name},</p>
      <p>Verify your email address:</p>
      <p><a href="${APP_BASE_URL}/verify-email?token=${verificationToken}">Verify email</a></p>
      <p>This link expires in 24 hours.</p>`,
  });

  res.json({ success: true, message: 'Verification email sent' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email address.',
    });
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });

  if (!user) {
    return res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  }

  const resetToken = randomToken();
  user.resetTokenHash = hashToken(resetToken);
  user.resetTokenExpires = new Date(Date.now() + 1000 * 60 * 60);
  await user.save();

  await sendMail({
    to: user.email,
    subject: 'Reset your TradeLog password',
    html: `<p>Hi ${user.name},</p>
      <p>Reset your password with this link:</p>
      <p><a href="${APP_BASE_URL}/reset-password?token=${resetToken}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
  });

  res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent.',
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Reset token is required.',
    });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters.',
    });
  }

  const hash = hashToken(token);
  const user = await User.findOne({
    resetTokenHash: hash,
    resetTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token.',
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.refreshTokenHash = undefined;
  user.refreshTokenExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, accountBalance } = req.body || {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }
    req.user.name = name.trim();
  }

  if (accountBalance !== undefined) {
    const balance = Number(accountBalance);
    if (!Number.isFinite(balance) || balance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Account balance must be a non-negative number.',
      });
    }
    req.user.accountBalance = Math.round(balance * 100) / 100;
  }

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
  req.user.refreshTokenHash = undefined;
  req.user.refreshTokenExpires = undefined;
  await req.user.save();

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
};
