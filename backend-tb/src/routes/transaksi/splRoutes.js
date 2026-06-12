const express = require('express');
const router = express.Router();
const verifikasiToken = require('../middleware/authMiddleware');
const splController = require('../../controllers/transaksi/splController');

// PWA HRD (Surat Perintah Lembur)
router.post('/lembur/spl', verifikasiToken, splController.createSPL);
router.get('/lembur/', verifikasiToken, splController.getSPL);
router.delete('/lembur/:id', verifikasiToken, splController.deleteSPL);
router.get('/lembur/all', verifikasiToken, splController.getAllSPL);


module.exports = router;