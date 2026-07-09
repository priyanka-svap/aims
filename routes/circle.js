const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/circleController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// Sheets
router.get('/sheets', ctrl.listSheets);
router.post('/sheets', requireRole('admin', 'manager', 'staff'), ctrl.upsertSheet);
router.delete('/sheets/:id', requireRole('admin'), ctrl.removeSheet);

// Outward
router.get('/outward', ctrl.listOutward);
router.post('/outward', requireRole('admin', 'manager', 'staff'), ctrl.createOutward);
router.delete('/outward/:id', requireRole('admin'), ctrl.removeOutward);

// Party Ledger (new dynamic Excel-style day-sheet, per shop)
router.get('/party-ledger', ctrl.listPartyLedger);
router.post('/party-ledger', requireRole('admin', 'manager', 'staff'), ctrl.upsertPartyLedger);
router.delete('/party-ledger/:id', requireRole('admin'), ctrl.removePartyLedger);

// Inward (stock arriving into a circle shop)
router.get('/inward', ctrl.listInward);
router.post('/inward', requireRole('admin', 'manager', 'staff'), ctrl.createInward);
router.delete('/inward/:id', requireRole('admin'), ctrl.removeInward);

// Parties
router.get('/parties', ctrl.listParties);
router.post('/parties', requireRole('admin', 'manager'), ctrl.createParty);
router.put('/parties/:id', requireRole('admin', 'manager'), ctrl.updateParty);
router.delete('/parties/:id', requireRole('admin'), ctrl.removeParty);

// Brands (Circle's own english/beer/desi list)
router.get('/brands', ctrl.listBrands);
router.post('/brands', requireRole('admin', 'manager'), ctrl.createBrand);
router.put('/brands/:id', requireRole('admin', 'manager'), ctrl.updateBrand);
router.delete('/brands/:id', requireRole('admin'), ctrl.removeBrand);

module.exports = router;
