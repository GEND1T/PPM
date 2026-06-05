const supabase = require('../config/supabaseClient');

// 1. GET: Ambil semua data absensi (Bisa difilter per rentang tanggal nantinya)
const getAllAbsen = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('absensi')
            .select(`
                id, tanggal, waktu_awal, waktu_akhir, status, status_lembur,
                pegawai (id, nama, jabatan (nama_jabatan))
            `)
            .order('tanggal', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllAbsen:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data absensi' });
    }
};

// 2. PUT: Update Absensi (Dipanggil saat HRD klik "Save" di DataGrid Frontend)
const updateAbsen = async (req, res) => {
    try {
        const { id } = req.params; // ID absensi dari URL parameter
        const { status_masuk, status_lembur } = req.body; // Data yang dikirim dari React

        // Mapping kembali ke nilai database (misal: "Tepat" menjadi "intime", "Terlambat" menjadi "late")
        let statusDB = status_masuk;
        if (status_masuk === 'Tepat') statusDB = 'intime';
        else if (status_masuk === 'Terlambat') statusDB = 'late';
        else if (status_masuk === 'Void') statusDB = 'void';

        const { data, error } = await supabase
            .from('absensi')
            .update({ 
                status: statusDB, 
                status_lembur: status_lembur 
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: 'Data absensi berhasil diperbarui', 
            data 
        });
    } catch (error) {
        console.error('Error updateAbsen:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui data absensi' });
    }
};

module.exports = { getAllAbsen, updateAbsen };