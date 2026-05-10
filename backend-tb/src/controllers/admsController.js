// File: src/controllers/admsController.js

const { parseAdmsLog } = require('../utils/admsParser');
const { prosesLogMesin } = require('../services/absensiService');

// Mesin ADMS selalu mengecek koneksi dengan GET Request terlebih dahulu
const handshake = (req, res) => {
    // Mesin mengharapkan response "OK"
    res.send('OK'); 
};

// Mesin mengirim data absensi melalui POST Request
const receiveData = async (req, res) => {
    try {
        // req.body berisi text mentah dari mesin karena kita pakai express.text() di app.js
        const rawLogData = req.body; 
        
        // 1. Pecah teks menjadi array
        const logs = parseAdmsLog(rawLogData);

        // 2. Proses tiap baris secara berurutan
        for (let log of logs) {
            await prosesLogMesin(log);
        }

        // 3. Kembalikan respons OK agar mesin menghapus log tersebut dari memory-nya
        res.send('OK\n'); 

    } catch (error) {
        console.error('Error saat memproses ADMS:', error);
        res.status(500).send('ERROR\n');
    }
};

module.exports = { handshake, receiveData };