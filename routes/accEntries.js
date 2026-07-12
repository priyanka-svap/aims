const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/accController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.listEntries);
router.post('/', requireRole('admin', 'manager'), ctrl.createEntry);
router.put('/:id', requireRole('admin', 'manager'), ctrl.updateEntry);
router.delete('/:id', requireRole('admin'), ctrl.removeEntry);

module.exports = router;
