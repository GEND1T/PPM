const express = require('express');
const router = express.Router();

const gajiController = require('../../controllers/transaksi/gajiController');

// --- Rute Gaji ---
router.get('/', gajiController.getAllGaji);
router.get('/mingguan', gajiController.getRekapMingguan);
router.post('/generate', gajiController.generateGaji);
router.get('/harian', gajiController.getRekapHarian);
router.post('/generate-massal', gajiController.generateGajiMassal);


module.exports = router;