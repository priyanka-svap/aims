const User = require('../models/User');

async function ensureAdmin() {
  const count = await User.countDocuments();
  if (count > 0) return;

  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Administrator';

  await User.create({ username, password, name, role: 'admin' });
  console.log(`[Auth] No users found — created default admin "${username}" / "${password}". Please change this password after first login.`);
}

module.exports = ensureAdmin;
