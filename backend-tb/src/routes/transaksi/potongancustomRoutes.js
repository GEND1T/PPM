const express = require('express');
const router = express.Router();
const verifikasiToken = require('../../middleware/authMiddleware');
const potongancustom = require('../../controllers/transaksi/potonganCustomController');

router.post('/', verifikasiToken, potongancustom.createPotonganCustom);
router.get('/', verifikasiToken, potongancustom.getPotonganCustom);
router.put('/:id', verifikasiToken, potongancustom.updatePotonganCustom);
router.delete('/:id', verifikasiToken, potongancustom.deletePotonganCustom);

module.exports = router;
