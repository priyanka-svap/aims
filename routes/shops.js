const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shopController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', requireRole('admin'), ctrl.create);
// Any authenticated user can save their brand drag-drop order — see updateBrandOrder's comment.
// Placed before the admin-only PUT '/:id' below (both listen on 'shops/:id' style paths but
// Express matches by full path+method, so order between these two doesn't itself matter — kept
// together here just for readability).
router.patch('/:id/brand-order', ctrl.updateBrandOrder);
router.put('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
