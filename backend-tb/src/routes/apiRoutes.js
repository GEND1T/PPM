// File: src/routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Endpoint untuk diakses PWA Mandor
router.put('/kerapian', apiController.updateKerapian);
// Endpoint untuk PWA HRD (Surat Perintah Lembur)
router.post('/lembur/spl', apiController.createSPL); // <--- Tambahkan baris ini
// Endpoint Tombol Nuklir (Void Absensi)
router.put('/absen/void', apiController.voidAbsensi); // <--- Tambahkan baris ini
// Endpoint Live Dashboard
router.get('/dashboard/live', apiController.getLiveDashboard); // <--- Tambahkan baris ini

module.exports = router;