const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/masterBrandController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('admin', 'manager'), ctrl.create);
router.put('/:id', requireRole('admin', 'manager'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
