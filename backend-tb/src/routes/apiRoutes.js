// File: src/routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const verifikasiToken = require('../middleware/authMiddleware');

// Endpoint Terbuka (Siapa saja bisa coba login)
router.post('/login', apiController.loginHRD);
router.post('/register', verifikasiToken,apiController.registerAdmin);

// Endpoint Terbuka (Dashboard biasanya untuk display di TV kantor, jadi tidak perlu dikunci)
router.get('/dashboard/live', apiController.getLiveDashboard);

// ==============================================================
// ZONA AMAN (ENDPOINT DI BAWAH INI WAJIB MEMBAWA TOKEN JWT)
// ==============================================================

const pengaturanController = require('../controllers/master/pengaturanController');

// PWA Mandor (Kerapian)
router.put('/kerapian', verifikasiToken, apiController.updateKerapian);

// Tombol Nuklir (Void Absensi)
router.put('/absen/void', verifikasiToken, apiController.voidAbsensi);

// Pengaturan Mesin Absensi
router.get('/pengaturan/mesin', verifikasiToken, pengaturanController.getPengaturanMesin);
router.put('/pengaturan/mesin', verifikasiToken, pengaturanController.updatePengaturanMesin);

module.exports = router;