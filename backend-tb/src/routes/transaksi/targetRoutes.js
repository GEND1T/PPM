const express = require('express');
const router = express.Router();

// Import controller (Sesuaikan path-nya jika berbeda)
const {
    getMasterTarget,
    upsertMasterTarget,
    inputPencapaianHarian,
    getPencapaianHarian,
    deletePencapaian
} = require('../../controllers/transaksi/targetController');

// Middleware otentikasi (Contoh: verifyToken, sesuaikan dengan milik Anda)
const verifikasiToken = require('../../middleware/authMiddleware');

// Route Master Target
router.get('/master', verifikasiToken, getMasterTarget);
router.post('/master', verifikasiToken, upsertMasterTarget);

// Route Pencapaian Harian
router.get('/pencapaian', verifikasiToken, getPencapaianHarian);
router.post('/pencapaian', verifikasiToken, inputPencapaianHarian);
router.delete('/pencapaian/:id', verifikasiToken, deletePencapaian);

module.exports = router;