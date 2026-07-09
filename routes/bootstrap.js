const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bootstrapController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', ctrl.getAll);

module.exports = router;
