const express = require('express');
const router = express.Router();

const absenController = require('../../controllers/transaksi/absenController');

router.get('/', absenController.getAllAbsen);
router.put('/:id', absenController.updateAbsen); // Menerima parameter ID
router.post('/manual', absenController.createAbsenManual); // Endpoint untuk menerima log dari mesin ADMS (jika diperlukan)

module.exports = router;