const supabase = require('../../config/supabaseClient');

// ==========================================
// FITUR BARU: API INPUT SPL (LEMBUR)
// ==========================================
const createSPL = async (req, res) => {
    try {
        // 1. Tambahkan is_custom_upah dan nominal_upah_custom ke destructuring req.body
        const { 
            pegawai_id, 
            tanggal, 
            menit_lembur_diizinkan, 
            alasan_lembur, 
            disetujui_oleh,
            is_custom_upah,         // <-- BARU
            nominal_upah_custom     // <-- BARU
        } = req.body;

        // Validasi input dasar
        if (!pegawai_id || !tanggal || typeof menit_lembur_diizinkan === 'undefined') {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap. Butuh pegawai_id, tanggal, dan menit_lembur_diizinkan.'
            });
        }

        // 2. Masukkan parameter baru ke dalam payload upsert
        const { data, error } = await supabase
            .from('otorisasi_lembur')
            .upsert({
                pegawai_id: pegawai_id,
                tanggal: tanggal,
                menit_lembur_diizinkan: menit_lembur_diizinkan,
                alasan_lembur: alasan_lembur || 'Lembur reguler',
                disetujui_oleh: disetujui_oleh || 'Sistem HRD',
                
                // Tambahkan field custom upah (Gunakan fallback ke false/0 jika kosong)
                is_custom_upah: is_custom_upah || false,
                nominal_upah_custom: is_custom_upah ? (nominal_upah_custom || 0) : 0
            }, { onConflict: 'pegawai_id, tanggal' }) 
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: 'Surat Perintah Lembur (SPL) berhasil disimpan.',
            data: data
        });

    } catch (error) {
        console.error('Error di API Input SPL:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat menyimpan SPL.'
        });
    }
};

// =========================================================================
// READ: Ambil Data Surat Perintah Lembur (SPL)
// =========================================================================
// Endpoint: GET /api/v1/lembur?bulan=06&tahun=2026&pegawai_id=5&tanggal=2026-06-12
const getSPL = async (req, res) => {
    try {
        const { bulan, tahun, pegawai_id, tanggal } = req.query;

        // 1. Inisiasi Query dengan Relasi (Join) ke tabel pegawai
        let query = supabase
            .from('otorisasi_lembur')
            .select(`
                id,
                pegawai_id,
                tanggal,
                menit_lembur_diizinkan,
                alasan_lembur,
                disetujui_oleh,
                created_at,
                pegawai (
                    nama,
                    jabatan (nama_jabatan)
                )
            `)
            .order('tanggal', { ascending: false }); // Urutkan dari yang terbaru

        // 2. Terapkan Filter Dinamis
        
        // A. Filter berdasarkan 1 Karyawan spesifik
        if (pegawai_id) {
            query = query.eq('pegawai_id', pegawai_id);
        }

        // B. Filter berdasarkan Tanggal Spesifik (Misal: melihat lembur hari ini saja)
        if (tanggal) {
            query = query.eq('tanggal', tanggal);
        } 
        // C. Filter berdasarkan Bulan dan Tahun (Untuk rekap/tabel utama)
        else if (bulan && tahun) {
            const awalBulan = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
            const totalHari = new Date(tahun, bulan, 0).getDate();
            const akhirBulan = `${tahun}-${String(bulan).padStart(2, '0')}-${String(totalHari).padStart(2, '0')}`;
            
            query = query.gte('tanggal', awalBulan).lte('tanggal', akhirBulan);
        }

        // 3. Eksekusi Query
        const { data, error } = await query;

        if (error) throw error;

        // 4. Format Kembalian agar rapi dan mudah dibaca frontend
        const formattedData = data.map(item => ({
            id: item.id,
            pegawai_id: item.pegawai_id,
            nama_pegawai: item.pegawai?.nama || 'Tanpa Nama',
            jabatan: item.pegawai?.jabatan?.nama_jabatan || '-',
            tanggal: item.tanggal,
            menit_lembur_diizinkan: item.menit_lembur_diizinkan,
            jam_lembur_estimasi: (item.menit_lembur_diizinkan / 60).toFixed(1), // Konversi bantu untuk UI
            alasan_lembur: item.alasan_lembur || '-',
            disetujui_oleh: item.disetujui_oleh || '-',
            created_at: item.created_at
        }));

        return res.status(200).json({ 
            success: true, 
            data: formattedData 
        });

    } catch (error) {
        console.error('Error getSpl:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data otorisasi lembur.' 
        });
    }
};

// ambil semua data spl saat ini dan yang akan datang
const getAllSPL = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
        
        const { data, error } = await supabase
            .from('otorisasi_lembur')
            // Melakukan Nested Join: Otorisasi Lembur -> Pegawai -> Jabatan
            .select(`
                *,
                pegawai (
                    nama,
                    jabatan (
                        upah_lembur_per_jam
                    )
                )
            `)
            .gte('tanggal', today) // Ambil SPL hari ini dan yang akan datang
            .order('tanggal', { ascending: true }); // Urutkan dari yang terdekat

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            data: data 
        });

    } catch (error) {
        console.error('Error getAllSpl:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data otorisasi lembur.' 
        });
    }
}

// hapus SPL berdasarkan ID
const deleteSPL = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('otorisasi_lembur')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: 'SPL berhasil dihapus.' 
        });

    } catch (error) {
        console.error('Error deleteSpl:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Gagal menghapus SPL.' 
        });
    }
}


module.exports = { createSPL, getSPL, getAllSPL, deleteSPL };