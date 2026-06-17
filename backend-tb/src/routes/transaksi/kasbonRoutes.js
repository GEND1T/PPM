const express = require('express');
const router = express.Router();

// Import controller
const {
    createKasbon,
    getKasbon,
    updateStatusKasbon,
    deleteKasbon
} = require('../../controllers/transaksi/kasbonController');


// Endpoint CRUD Kasbon
router.post('/',  createKasbon);               // CREATE: Ajukan kasbon baru
router.get('/',  getKasbon);                   // READ: Ambil daftar kasbon
router.patch('/:id/status',  updateStatusKasbon); // UPDATE: Setuju/Tolak status kasbon
router.delete('/:id',  deleteKasbon);          // DELETE: Hapus kasbon

module.exports = router;
