const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movementController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', requireRole('admin', 'manager', 'staff'), ctrl.create);
router.put('/:id', requireRole('admin', 'manager'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
