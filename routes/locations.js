const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/locationController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', requireRole('admin', 'manager'), ctrl.create);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
