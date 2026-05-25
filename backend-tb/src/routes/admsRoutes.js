// File: src/routes/admsRoutes.js
const express = require('express');
const router = express.Router();
const admsController = require('../controllers/admsController');

router.get('/cdata', admsController.handshake);
router.post('/cdata', admsController.receiveData);

module.exports = router;