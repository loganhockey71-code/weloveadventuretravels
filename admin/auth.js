const fs = require('fs');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { AUTH_FILE } = require('./pages-config');

function hasAdminAccount() {
  return fs.existsSync(AUTH_FILE);
}

function loadAccount() {
  if (!hasAdminAccount()) return null;
  return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
}

function verifyLogin(username, password) {
  const account = loadAccount();
  if (!account) return false;
  if (typeof username !== 'string' || typeof password !== 'string') return false;
  // Trim stray whitespace from copy/paste, and treat username as case-insensitive —
  // the password itself stays case-sensitive.
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();
  if (cleanUsername !== account.username.trim().toLowerCase()) return false;
  return bcrypt.compareSync(cleanPassword, account.passwordHash);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    req.session.lastActive = Date.now();
    return next();
  }
  return res.redirect('/admin/login');
}

// 8 attempts per 15 minutes per IP — slows brute-forcing without locking out a real user typo-ing their password a couple times.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please wait 15 minutes and try again.',
});

module.exports = { hasAdminAccount, loadAccount, verifyLogin, requireAuth, loginLimiter };
