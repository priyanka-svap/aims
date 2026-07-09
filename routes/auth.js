const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Public
router.post('/login', ctrl.login);

// Registering new users requires an authenticated admin
// (the very first admin user is auto-created by seed/ensureAdmin on server start)
router.post('/register', requireAuth, requireRole('admin'), ctrl.register);

// Authenticated user routes
router.get('/me', requireAuth, ctrl.me);
router.post('/change-password', requireAuth, ctrl.changePassword);

module.exports = router;
