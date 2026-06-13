const express = require('express');
const router = express.Router();
const verifikasiToken = require('../../middleware/authMiddleware');
const splController = require('../../controllers/transaksi/splController');

// PWA HRD (Surat Perintah Lembur)
router.post('/spl', verifikasiToken, splController.createSPL);
router.get('/', verifikasiToken, splController.getSPL);
router.delete('/:id', verifikasiToken, splController.deleteSPL);
router.get('/all', verifikasiToken, splController.getAllSPL);


module.exports = router;