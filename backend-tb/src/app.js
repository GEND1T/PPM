// File: src/app.js

require('dotenv').config();
const express = require('express');
const supabase = require('./config/supabaseClient'); // Memanggil koneksi database
const { initCronJobs } = require('./cron/dailyTasks'); // Mengimpor cron jobs
const { initRekapCronJobs } = require('./cron/rekapTasks');

const app = express();
const port = process.env.PORT || 3000;

// Middleware agar Express bisa membaca data JSON dan raw text
app.use(express.json()); 
app.use(express.text()); // Sangat penting untuk menerima data mentah dari mesin ADMS
app.use(express.urlencoded({ extended: true }));

// Routing ADMS
const admsRoutes = require('./routes/admsRoutes'); 
app.use('/iclock', admsRoutes);      
// Routing API PWA (Tambahkan 2 baris ini)
const apiRoutes = require('./routes/apiRoutes');
app.use('/api', apiRoutes);              

// Rute Test / Health Check (Untuk memastikan server nyala)
app.get('/ping', (req, res) => {
    res.json({ message: 'Pong! Backend Absensi ADMS Berjalan Lancar 🚀' });
});

// ==========================================
// BAGIAN YANG TERLEWAT: Menyalakan Cron Job
// ==========================================
initCronJobs(); 
initRekapCronJobs();  // Cron Mingguan (Payroll & THR) <--- Tambahkan baris ini

// Jalankan Server
app.listen(port, () => {
    console.log(`=================================`);
    console.log(`🚀 Server berjalan di Port: ${port}`);
    console.log(`=================================`);
});