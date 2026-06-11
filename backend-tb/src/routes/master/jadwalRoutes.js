const express = require('express');
const router = express.Router();
const jadwalController = require('../../controllers/master/jadwalController');

// Route CRUD Standard & Bulk
router.get('/', jadwalController.getAllJadwal);
router.post('/', jadwalController.createJadwalSatuan);
router.post('/generate-massal', jadwalController.generateJadwalMassal);
router.put('/:id', jadwalController.updateJadwalKaryawan);
router.delete('/:id', jadwalController.deleteJadwalKaryawan);
// Tambahkan baris ini di file router jadwal Anda
router.post('/harian', jadwalController.generateJadwalHarian);
// Integrasi Fitur Tukar Shift Dinamis
router.post('/tukar-shift', jadwalController.tukarShiftKaryawan);


module.exports = router;