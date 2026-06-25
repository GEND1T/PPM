// File: src/routes/index.js
const express = require('express');
const router = express.Router();

// Import Middleware Keamanan
const verifikasiToken = require('../middleware/authMiddleware');

// Import semua rute spesifik (Nantinya Jabatan, Pegawai, dll ditambahkan di sini)
const departemenRoutes = require('./master/departemenRoutes');
const jabatanRoutes = require('./master/jabatanRoutes');
const shiftRoutes = require('./master/shiftRoutes');
const pegawaiRoutes = require('./master/pegawaiRoutes');
const absenRoutes = require('./transaksi/absenRoutes');
const gajiRoutes = require('./transaksi/gajiRoutes');
const jadwalRoutes = require('./master/jadwalRoutes');
const splRoutes = require('./transaksi/splRoutes');
const targetRoutes = require('./transaksi/targetRoutes');
const kasbonRoutes = require('./transaksi/kasbonRoutes');
const bonusCustomRoutes = require('./transaksi/bonuscustomRoutes');


// Daftarkan rute dan pasang gembok JWT secara global untuk rute ini
// Artinya semua aksi CRUD departemen butuh token HRD
router.use('/departemen', verifikasiToken, departemenRoutes);
router.use('/jabatan', verifikasiToken, jabatanRoutes);
router.use('/shifts', verifikasiToken, shiftRoutes);
router.use('/pegawai', verifikasiToken, pegawaiRoutes);
router.use('/absen', verifikasiToken, absenRoutes);
router.use('/gaji', verifikasiToken, gajiRoutes);
router.use('/jadwal', verifikasiToken, jadwalRoutes);
router.use('/lembur', verifikasiToken, splRoutes);
router.use('/target', verifikasiToken, targetRoutes);
router.use('/kasbon', verifikasiToken, kasbonRoutes);
router.use('/bonus-custom', verifikasiToken, bonusCustomRoutes);

module.exports = router;