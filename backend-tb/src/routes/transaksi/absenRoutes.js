const express = require('express');
const router = express.Router();

const absenController = require('../../controllers/transaksi/absenController');
const verifikasiToken = require('../../middleware/authMiddleware');


router.get('/', verifikasiToken, absenController.getAllAbsen);
router.put('/:id', verifikasiToken, absenController.updateAbsen); // Menerima parameter ID
router.post('/manual', verifikasiToken, absenController.createAbsenManual); // Endpoint untuk membuat absensi manual
router.post('/simulasi-mesin', verifikasiToken, absenController.simulasiLogMesin); // Endpoint simulasi kirim log mesin absensi

module.exports = router;