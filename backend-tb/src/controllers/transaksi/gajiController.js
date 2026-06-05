const supabase = require('../config/supabaseClient');

// 1. GET: Ambil daftar riwayat penggajian
const getAllGaji = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('penggajian') // Asumsi nama tabel adalah 'penggajian'
            .select(`
                id, periode_bulan, periode_tahun, total_gaji, status_pembayaran,
                pegawai (nama, nik, no_hp)
            `)
            .order('periode_tahun', { ascending: false })
            .order('periode_bulan', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllGaji:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data gaji' });
    }
};

// 2. POST: Hitung dan buat Slip Gaji baru (Generate Payroll)
const generateGaji = async (req, res) => {
    try {
        const { pegawai_id, periode_bulan, periode_tahun } = req.body;

        // Validasi input
        if (!pegawai_id || !periode_bulan || !periode_tahun) {
            return res.status(400).json({ success: false, message: 'Data periode dan pegawai tidak lengkap' });
        }

        // --- Di sini nantinya akan ada logika perhitungan: ---
        // 1. Ambil Gaji Pokok dari tabel jabatan
        // 2. Hitung jumlah absen (Terlambat dipotong berapa?)
        // 3. Hitung jumlah uang lembur dari tabel absensi (jika status_lembur = 'Lembur')
        
        // Simulai data perhitungan sementara
        const totalGajiDihitung = 5000000; // Contoh statis

        // Insert ke database
        const { data, error } = await supabase
            .from('penggajian')
            .insert([{ 
                pegawai_id, 
                periode_bulan, 
                periode_tahun, 
                total_gaji: totalGajiDihitung,
                status_pembayaran: 'Pending'
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({ success: true, message: 'Slip gaji berhasil dibuat', data });
    } catch (error) {
        console.error('Error generateGaji:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal melakukan generate gaji' });
    }
};

module.exports = { getAllGaji, generateGaji };