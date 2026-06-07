const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

// Tambahkan rute GET baru ini
router.get('/cron/rekap-mingguan', cronController.triggerRekapMingguan);
router.get('/cron/rekap-harian', cronController.triggerRekapHarian);

module.exports = router;
