// File: src/app.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');   
const supabase = require('./config/supabaseClient'); // Memanggil koneksi database
const app = express();
const port = process.env.PORT || 3000;

// Middleware agar Express bisa membaca data JSON dan raw text
app.use(express.json()); 
app.use(express.text()); // Sangat penting untuk menerima data mentah dari mesin ADMS
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routing ADMS
const admsRoutes = require('./routes/admsRoutes'); 
app.use('/iclock', admsRoutes);      
// Routing API PWA (Tambahkan 2 baris ini)
const apiRoutes = require('./routes/apiRoutes');
app.use('/api', apiRoutes);
// ==========================================
// V1 API ROUTING (Struktur Baru yang Rapi)
// ==========================================
const v1Routes = require('./routes/index'); 
app.use('/api/v1', v1Routes);

const cronRoutes = require('./routes/cronRoutes');
app.use('/api/cron', cronRoutes);

// Rute Test / Health Check (Untuk memastikan server nyala)
app.get('/', (req, res) => {
    res.json({ message: 'Pong! Backend Absensi ADMS Berjalan Lancar 🚀' });
});

// Jalankan Server
app.listen(port, () => {
    console.log(`=================================`);
    console.log(`🚀 Server berjalan di Port: ${port}`);
    console.log(`=================================`);
});

module.exports = app;
