// File: src/routes/admsRoutes.js
const express = require('express');
const router = express.Router();
const admsController = require('../controllers/admsController');
const absenController = require('../controllers/transaksi/absenController');

router.get('/cdata', admsController.handshake);
router.post('/cdata', admsController.receiveData);
router.post('/simulasi', absenController.simulasiLogMesin);

module.exports = router;