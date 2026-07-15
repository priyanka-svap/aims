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
// Must be registered BEFORE '/:id' — otherwise Express would match "bulk" as an :id.
router.put('/bulk', requireRole('admin', 'manager'), ctrl.bulkUpsert);
router.put('/:id', requireRole('admin', 'manager'), ctrl.update);
router.patch('/:id/stock', requireRole('admin', 'manager', 'staff'), ctrl.adjustStock);
// Must be registered BEFORE '/:id' — otherwise Express would match "bulk" as an :id.
router.delete('/bulk', requireRole('admin'), ctrl.bulkRemove);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
