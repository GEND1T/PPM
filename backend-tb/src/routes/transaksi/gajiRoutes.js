const express = require('express');
const router = express.Router();

const gajiController = require('../../controllers/transaksi/gajiController');
const verifikasiToken = require('../../middleware/authMiddleware');

// --- Rute Gaji ---
router.get('/', verifikasiToken, gajiController.getRekapGaji);
router.post('/generate-massal', verifikasiToken, gajiController.generateGajiMassal);
router.patch('/:id/lunas', verifikasiToken, gajiController.pelunasanGaji);


module.exports = router;