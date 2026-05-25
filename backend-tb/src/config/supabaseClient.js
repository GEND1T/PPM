// File: src/config/supabaseClient.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Membaca file .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL atau Key belum disetting di file .env');
}

// Inisialisasi Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase Client berhasil diinisialisasi.');

// Ekspor agar bisa dipakai di file controllers/services nantinya
module.exports = supabase;