const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ledgerController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// :store -> circle | nokha | warehouse
router.get('/:store', ctrl.list);
router.post('/:store', requireRole('admin', 'manager', 'staff'), ctrl.create);
router.put('/entry/:id', requireRole('admin', 'manager', 'staff'), ctrl.update);
router.delete('/entry/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
