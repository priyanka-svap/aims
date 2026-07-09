const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/accountController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', requireRole('admin', 'manager'), ctrl.upsert);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
