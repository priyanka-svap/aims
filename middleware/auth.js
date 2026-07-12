const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Every protected API call was doing a fresh User.findById() — for a single page load
// that fires 8-10 requests back to back (bootstrap + ledger + brands + accounts...) that's
// 8-10 redundant round-trips to Mongo just to re-confirm the *same* logged-in user each
// time. This short-lived in-memory cache collapses a burst of requests from one user into
// a single DB hit, with a small bounded staleness window (worst case CACHE_TTL_MS before a
// password change / deactivation is picked up on other requests already in flight).
const userCache = new Map(); // userId -> { user, expiresAt }
const CACHE_TTL_MS = 30 * 1000;

async function getCachedUser(id) {
  const key = String(id);
  const hit = userCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.user;
  const user = await User.findById(id).select('-password').lean();
  if (user) userCache.set(key, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  else userCache.delete(key);
  return user;
}

// Call after any change to a user's password/active/role so the cache doesn't keep
// serving stale data for the rest of its TTL window.
function invalidateUserCache(id) {
  if (id) userCache.delete(String(id));
}

// Verifies the Bearer token and attaches `req.user`
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getCachedUser(payload.id);
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Restricts to specific roles, usage: requireRole('admin','manager')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, invalidateUserCache };
