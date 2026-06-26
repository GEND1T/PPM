const express = require('express');
const router = express.Router();

const absenController = require('../../controllers/transaksi/absenController');
const verifikasiToken = require('../../middleware/authMiddleware');


router.get('/', verifikasiToken, absenController.getAllAbsen);
router.put('/:id', verifikasiToken, absenController.updateAbsen); // Menerima parameter ID
router.post('/manual', verifikasiToken, absenController.createAbsenManual); // Endpoint untuk menerima log dari mesin ADMS (jika diperlukan)

module.exports = router;