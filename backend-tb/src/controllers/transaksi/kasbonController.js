const supabase = require('../../config/supabaseClient');

// =========================================================================
// 1. CREATE: Pengajuan Kasbon Baru
// =========================================================================
const createKasbon = async (req, res) => {
    try {
        const { pegawai_id, keterangan_pinjaman, tanggal_pengajuan, nominal_pinjaman, persentase_cicilan } = req.body;

        // Validasi kelengkapan data
        if (!pegawai_id || !keterangan_pinjaman || !tanggal_pengajuan || !nominal_pinjaman || !persentase_cicilan) {
            return res.status(400).json({ success: false, message: 'Semua form pengajuan kasbon wajib diisi.' });
        }

        // Validasi Aturan Bisnis (Persentase 10% - 100%)
        if (persentase_cicilan < 10 || persentase_cicilan > 100) {
            return res.status(400).json({ success: false, message: 'Persentase cicilan minimal 10% dan maksimal 100%.' });
        }

        // Kalkulasi Otomatis Backend
        const nominal_cicilan_per_gajian = (nominal_pinjaman * persentase_cicilan) / 100;
        const sisa_pinjaman = nominal_pinjaman; // Awal pinjam, sisa utang = nominal utuh

        const payload = {
            pegawai_id,
            keterangan_pinjaman,
            tanggal_pengajuan,
            nominal_pinjaman,
            persentase_cicilan,
            nominal_cicilan_per_gajian,
            sisa_pinjaman,
            status: 'Pending' // Selalu default ke Pending saat diajukan
        };

        const { data, error } = await supabase.from('kasbon').insert([payload]).select();

        if (error) throw error;

        return res.status(201).json({ 
            success: true, 
            message: 'Pengajuan kasbon berhasil dikirim dan menunggu persetujuan.', 
            data 
        });

    } catch (error) {
        console.error('Error createKasbon:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal membuat pengajuan kasbon.' });
    }
};

// =========================================================================
// 2. READ: Ambil Daftar Kasbon (Bisa di-filter)
// =========================================================================
const getKasbon = async (req, res) => {
    try {
        const { pegawai_id, status } = req.query;

        let query = supabase
            .from('kasbon')
            .select(`
                *,
                pegawai (nama, jabatan(nama_jabatan))
            `)
            .order('tanggal_pengajuan', { ascending: false }); // Yang terbaru di atas

        // Terapkan filter jika ada
        if (pegawai_id) query = query.eq('pegawai_id', pegawai_id);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getKasbon:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data kasbon.' });
    }
};

// =========================================================================
// 3. UPDATE: Persetujuan / Penolakan Kasbon oleh HRD
// =========================================================================
const updateStatusKasbon = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, disetujui_oleh } = req.body;

        // Validasi input status yang diizinkan
        const validStatuses = ['Pending', 'Disetujui', 'Ditolak', 'Lunas'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Status tidak valid.' });
        }

        const { data, error } = await supabase
            .from('kasbon')
            .update({ status, disetujui_oleh })
            .eq('id', id)
            .select();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: `Status kasbon berhasil diubah menjadi ${status}.`, 
            data 
        });
    } catch (error) {
        console.error('Error updateStatusKasbon:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengubah status kasbon.' });
    }
};

// =========================================================================
// 4. DELETE: Hapus Kasbon (Hanya berlaku untuk yang salah input)
// =========================================================================
const deleteKasbon = async (req, res) => {
    try {
        const { id } = req.params;

        // Proteksi: Jangan biarkan menghapus kasbon yang sedang berjalan (sisa_pinjaman < nominal_pinjaman)
        // karena artinya utang tersebut sudah pernah dicicil di sistem gaji.
        const { data: existingData } = await supabase
            .from('kasbon')
            .select('nominal_pinjaman, sisa_pinjaman')
            .eq('id', id)
            .single();

        if (existingData && existingData.sisa_pinjaman < existingData.nominal_pinjaman) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kasbon ini tidak bisa dihapus karena sudah ada riwayat cicilan gaji yang berjalan.' 
            });
        }

        const { error } = await supabase.from('kasbon').delete().eq('id', id);
        
        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Data pengajuan kasbon berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleteKasbon:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menghapus data kasbon.' });
    }
};

module.exports = {
    createKasbon,
    getKasbon,
    updateStatusKasbon,
    deleteKasbon
};