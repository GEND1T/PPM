const { prosesRekapMingguan } = require('../cron/rekapTasks');
const { prosesPenaltiLupaPulang } = require('../cron/dailyTasks');

const triggerRekapMingguan = async (req, res) => {
    // 🛡️ KEAMANAN SANGAT PENTING: 
    // Pastikan yang menembak URL ini benar-benar mesin Vercel, bukan orang iseng
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ success: false, message: 'Akses ditolak. Token Cron tidak valid.' });
    }

    try {
        // Panggil fungsi rekap Anda (menunggu sampai selesai)
        await prosesRekapMingguan();
        return res.status(200).json({ success: true, message: 'Cron Rekap Mingguan berhasil dijalankan!' });
    } catch (error) {
        console.error('API Cron Error:', error);
        return res.status(500).json({ success: false, message: 'Gagal menjalankan rekap mingguan.' });
    }
};


const triggerRekapHarian = async (req, res) => {
    // 🛡️ KEAMANAN SANGAT PENTING: 
    // Pastikan yang menembak URL ini benar-benar mesin Vercel, bukan orang iseng
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ success: false, message: 'Akses ditolak. Token Cron tidak valid.' });
    }

    try {
        // Panggil fungsi rekap Anda (menunggu sampai selesai)
        await prosesPenaltiLupaPulang();
        return res.status(200).json({ success: true, message: 'Cron Rekap Mingguan berhasil dijalankan!' });
    } catch (error) {
        console.error('API Cron Error:', error);
        return res.status(500).json({ success: false, message: 'Gagal menjalankan rekap mingguan.' });
    }
};

module.exports = { triggerRekapMingguan, triggerRekapHarian };
