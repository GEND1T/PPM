// File: src/routes/master/shiftRoutes.js

const express = require('express');
const router = express.Router();
const shiftController = require('../../controllers/master/shiftController');

router.post('/', shiftController.createShift);
router.get('/', shiftController.getAllShifts);
router.get('/:id', shiftController.getShiftById);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);

module.exports = router;