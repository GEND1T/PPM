const express = require('express');
const router = express.Router();

const gajiController = require('../../controllers/transaksi/gajiController');

// --- Rute Gaji ---
router.get('/', gajiController.getRekapGaji);
router.post('/generate-massal', gajiController.generateGajiMassal);
router.patch('/:id/lunas', gajiController.pelunasanGaji);


module.exports = router;