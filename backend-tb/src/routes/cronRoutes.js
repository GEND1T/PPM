const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

// Tambahkan rute GET baru ini
router.get('/rekap-harian', cronController.masterCronTrigger);

module.exports = router;
