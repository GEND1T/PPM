// File: src/routes/master/jabatanRoutes.js

const express = require('express');
const router = express.Router();
const jabatanController = require('../../controllers/master/jabatanController');

router.post('/', jabatanController.createJabatan);
router.get('/', jabatanController.getAllJabatan);
router.get('/:id', jabatanController.getJabatanById);
router.put('/:id', jabatanController.updateJabatan);
router.delete('/:id', jabatanController.deleteJabatan);

module.exports = router;    