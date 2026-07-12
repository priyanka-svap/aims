const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { invalidateUserCache } = require('../middleware/auth');

function safeUser(u) {
  return { id: u._id, username: u.username, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt };
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register  (admin-only in practice, see routes)
exports.register = async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      password,
      name: name || '',
      role: role && ['admin', 'manager', 'staff'].includes(role) ? role : 'staff',
    });

    const token = signToken(user);
    res.status(201).json({ success: true, token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = signToken(user);
    res.json({ success: true, token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ success: true, user: safeUser(req.user) });
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    invalidateUserCache(user._id);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password', error: err.message });
  }
};
