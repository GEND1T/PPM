const { prosesRekapMingguan } = require('../cron/rekapTasks');
const { prosesPenaltiLupaPulang } = require('../cron/dailyTasks');
const { prosesGenerateJadwalMingguanOtomatis } = require('../controllers/master/jadwalController');


const masterCronTrigger = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ success: false, message: 'Akses ditolak.' });
    }

    try {
        console.log('🚀 [MASTER CRON] Dimulai...');
        const d = new Date();
        const localTime = new Date(d.getTime() + (7 * 60 * 60 * 1000)); // Konversi ke WIB
        const hariIni = localTime.getDay(); // 6 = Sabtu

        let report = {
            tugas_harian: 'Belum Dijalankan',
            tugas_rekap_keuangan_mingguan: 'Dilewati',
            tugas_auto_generate_jadwal_mingguan: 'Dilewati' // Default report
        };

        // ==========================================
        //  EKSEKUSI TUGAS HARIAN (Setiap Hari)
        // ==========================================
        console.log('⏳ Menjalankan Tugas Harian...');
        prosesPenaltiLupaPulang(); 
        report.tugas_harian = 'Selesai';

        // ==========================================
        // EKSEKUSI TUGAS MINGGUAN (Khusus Sabtu Malam)
        // ==========================================
        if (hariIni === 6) {
            // 1. Eksekusi Rekap Finansial Mingguan & THR
            console.log('⏳ Menjalankan Rekap Keuangan Mingguan...');
            await prosesRekapMingguan();
            report.tugas_rekap_keuangan_mingguan = 'Selesai';

            // 2. Eksekusi Auto-Generate Jadwal Kerja Minggu Depan
            console.log('⏳ Menjalankan Pembuatan Jadwal Kerja Otomatis...');
            await prosesGenerateJadwalMingguanOtomatis();
            report.tugas_auto_generate_jadwal_mingguan = 'Selesai';
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Master Cron berhasil mengeksekusi semua modul.',
            laporan_eksekusi: report
        });

    } catch (error) {
        console.error('❌ [MASTER CRON] Error:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem.' });
    }
};

module.exports = { masterCronTrigger };