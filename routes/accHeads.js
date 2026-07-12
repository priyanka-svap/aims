const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/accController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.listHeads);
router.post('/', requireRole('admin', 'manager'), ctrl.createHead);
router.put('/:id', requireRole('admin', 'manager'), ctrl.updateHead);
router.delete('/:id', requireRole('admin'), ctrl.removeHead);

module.exports = router;
