// File: src/routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const verifikasiToken = require('../middleware/authMiddleware');
const absenController = require('../controllers/transaksi/absenController');
const gajiController = require('../controllers/transaksi/gajiController');

// Endpoint Terbuka (Siapa saja bisa coba login)
router.post('/login', apiController.loginHRD);
router.post('/register', verifikasiToken,apiController.registerAdmin);

// Endpoint Terbuka (Dashboard biasanya untuk display di TV kantor, jadi tidak perlu dikunci)
router.get('/dashboard/live', apiController.getLiveDashboard);

// ==============================================================
// ZONA AMAN (ENDPOINT DI BAWAH INI WAJIB MEMBAWA TOKEN JWT)
// ==============================================================


// Di bagian rute yang terlindungi (di bawah middleware JWT):
// --- Rute Absensi ---
router.get('/absensi', absenController.getAllAbsen);
router.put('/absensi/:id', absenController.updateAbsen); // Menerima parameter ID

// --- Rute Gaji ---
router.get('/gaji', gajiController.getAllGaji);
router.post('/gaji/generate', gajiController.generateGaji);

// PWA Mandor (Kerapian)
router.put('/kerapian', verifikasiToken, apiController.updateKerapian);

// PWA HRD (Surat Perintah Lembur)
router.post('/lembur/spl', verifikasiToken, apiController.createSPL);

// Tombol Nuklir (Void Absensi)
router.put('/absen/void', verifikasiToken, apiController.voidAbsensi);


module.exports = router;