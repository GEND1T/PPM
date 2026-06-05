const express = require('express');
const router = express.Router();

const absenController = require('../../controllers/transaksi/absenController');

router.get('/', absenController.getAllAbsen);
router.put('/:id', absenController.updateAbsen); // Menerima parameter ID

module.exports = router;