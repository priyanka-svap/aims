const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/sheetController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// :sheetType -> rora | main | nokha
router.get('/:sheetType', ctrl.list);
router.post('/:sheetType', requireRole('admin', 'manager', 'staff'), ctrl.upsert);
router.delete('/entry/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
