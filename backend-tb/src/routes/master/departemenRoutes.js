// File: src/routes/master/departemenRoutes.js

const express = require('express');
const router = express.Router();
const departemenController = require('../../controllers/master/departemenController');

// Ingat: Parameter '/' di sini nantinya akan menjadi '/api/v1/departemen' karena diatur di Master Router
router.post('/', departemenController.createDepartemen);
router.get('/', departemenController.getAllDepartemen);
router.get('/:id', departemenController.getDepartemenById);
router.put('/:id', departemenController.updateDepartemen);
router.delete('/:id', departemenController.deleteDepartemen);

module.exports = router;    