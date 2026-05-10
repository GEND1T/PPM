// File: src/routes/master/pegawaiRoutes.js

const express = require('express');
const router = express.Router();
const pegawaiController = require('../../controllers/master/pegawaiController');

router.post('/', pegawaiController.createPegawai);
router.get('/', pegawaiController.getAllPegawai);
router.get('/:id', pegawaiController.getPegawaiById);
router.put('/:id', pegawaiController.updatePegawai);
router.delete('/:id', pegawaiController.deletePegawai);

module.exports = router;