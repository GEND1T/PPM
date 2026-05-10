// File: src/routes/index.js

const express = require('express');
const router = express.Router();

// Import Middleware Keamanan
const verifikasiToken = require('../middleware/authMiddleware');

// Import semua rute spesifik (Nantinya Jabatan, Pegawai, dll ditambahkan di sini)
const departemenRoutes = require('./master/departemenRoutes');
const jabatanRoutes = require('./master/jabatanRoutes'); // <--- Tambahkan import ini

// Daftarkan rute dan pasang gembok JWT secara global untuk rute ini
// Artinya semua aksi CRUD departemen butuh token HRD
router.use('/departemen', verifikasiToken, departemenRoutes);
router.use('/jabatan', verifikasiToken, jabatanRoutes);

module.exports = router;