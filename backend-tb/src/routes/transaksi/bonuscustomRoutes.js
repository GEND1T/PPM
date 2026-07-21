const express = require('express');
const router = express.Router();
const verifikasiToken = require('../../middleware/authMiddleware');
const bonuscustom = require('../../controllers/transaksi/bonusCustomController');

// PWA HRD (Surat Perintah Lembur)
router.post('/', verifikasiToken, bonuscustom.createBonusCustom);
router.get('/', verifikasiToken, bonuscustom.getBonusCustom);
router.put('/:id', verifikasiToken, bonuscustom.updateBonusCustom);
router.delete('/:id', verifikasiToken, bonuscustom.deleteBonusCustom);

module.exports = router;