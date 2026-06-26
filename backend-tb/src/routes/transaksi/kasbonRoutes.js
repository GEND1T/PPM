const express = require('express');
const router = express.Router();

const casbonController = require('../../controllers/transaksi/kasbonController');
const verifikasiToken = require('../../middleware/authMiddleware');


// Endpoint CRUD Kasbon
router.post('/', verifikasiToken, casbonController.createKasbon);                
router.get('/', verifikasiToken, casbonController.getKasbon);                    
router.patch('/:id/status', verifikasiToken, casbonController.updateStatusKasbon); 
router.delete('/:id', verifikasiToken, casbonController.deleteKasbon);          
router.patch('/:id/bayar-manual', verifikasiToken, casbonController.bayarCicilanManual);
router.get('/riwayat', verifikasiToken, casbonController.getRiwayatKasbon);

module.exports = router;
