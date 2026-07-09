const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

// All inventory routes require a logged-in user
router.use(requireAuth);

router.get('/low-stock', ctrl.lowStock);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

router.post('/', requireRole('admin', 'manager'), ctrl.create);
router.put('/:id', requireRole('admin', 'manager'), ctrl.update);
router.patch('/:id/stock', requireRole('admin', 'manager', 'staff'), ctrl.adjustStock);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
