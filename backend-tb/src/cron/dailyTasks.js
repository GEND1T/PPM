// File: src/cron/dailyTasks.js

const cron = require('node-cron');
const supabase = require('../config/supabaseClient');

// Fungsi untuk mengeksekusi penalti "Lupa Pulang"
async function prosesPenaltiLupaPulang() {
    console.log('⏳ [CRON] Menjalankan pengecekan Lupa Pulang...');

    // Dapatkan tanggal hari ini dengan format YYYY-MM-DD (Waktu Lokal)
    const today = new Date().toLocaleDateString('en-CA'); 

    try {
        // 1. Cari semua absen hari ini yang belum ada waktu kepulangannya (masih menggantung)
        const { data: absenMenggantung, error: fetchError } = await supabase
            .from('absensi')
            .select('*')
            .eq('tanggal', today)
            .is('waktu_akhir', null); 

        if (fetchError) throw fetchError;

        if (!absenMenggantung || absenMenggantung.length === 0) {
            console.log('✅ [CRON] Aman. Tidak ada pegawai yang lupa absen pulang hari ini.');
            return;
        }

        console.log(`⚠️ [CRON] Ditemukan ${absenMenggantung.length} pegawai lupa pulang. Memproses penalti...`);

        // 2. Looping untuk memberikan penalti pada masing-masing pegawai
        for (let absen of absenMenggantung) {
            
            // PERBAIKAN: Logika perhitungan takeHomePayBaru sudah dihapus dari sini

            const { error: updateError } = await supabase
                .from('absensi')
                .update({
                    status: 'lupa_pulang',
                    bonus_kedisiplinan: 0, // HUKUMAN: Bonus pagi hangus
                    upah_lembur: 0,
                    is_penalti_lupa_pulang: true // Flagging untuk mempermudah HRD melihat history
                    // PERBAIKAN: take_home_pay tidak lagi dikirim ke database
                })
                .eq('id', absen.id);

            if (updateError) {
                console.error(`❌ [CRON] Gagal memproses penalti ID ${absen.id}:`, updateError.message);
            } else {
                console.log(`🔨 [CRON] Penalti dieksekusi untuk data absensi ID ${absen.id}`);
            }
        }

        console.log('✅ [CRON] Proses pengecekan Lupa Pulang selesai.');

    } catch (error) {
        console.error('❌ [CRON] Terjadi kesalahan fatal pada sistem Cron:', error.message);
    }
}

module.exports = { prosesPenaltiLupaPulang };
