// File: src/routes/master/polaRotasiRoutes.js

const express = require('express');
const router = express.Router();
const polaRotasiController = require('../../controllers/master/polaRotasiController');

router.get('/', polaRotasiController.getAllPola);
router.post('/', polaRotasiController.createPola);
router.put('/:id', polaRotasiController.updatePola);
router.delete('/:id', polaRotasiController.deletePola);

module.exports = router;
