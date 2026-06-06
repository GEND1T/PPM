// File: src/controllers/master/jabatanController.js

const supabase = require('../../config/supabaseClient');

// 1. CREATE: Tambah Jabatan Baru
const createJabatan = async (req, res) => {
    try {
        const {
            departemen_id, nama_jabatan, upah_per_kehadiran, bonus_disiplin_harian,
            upah_lembur_per_jam, bonus_minggu_6_hari, bonus_minggu_5_hari,
            bonus_minggu_harian, bonus_kerapian_harian, bonus_lembur_tahunan,tipe_penggajian
        } = req.body;

        if (!nama_jabatan) {
            return res.status(400).json({ success: false, message: 'Nama jabatan wajib diisi.' });
        }

        const { data, error } = await supabase
            .from('jabatan')
            .insert([{
                departemen_id, nama_jabatan, upah_per_kehadiran, bonus_disiplin_harian,
                upah_lembur_per_jam, bonus_minggu_6_hari, bonus_minggu_5_hari,
                bonus_minggu_harian, bonus_kerapian_harian, bonus_lembur_tahunan,tipe_penggajian
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({ success: true, message: 'Jabatan berhasil ditambahkan.', data });
    } catch (error) {
        console.error('Error createJabatan:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menambah data. Pastikan departemen_id valid jika diisi.' });
    }
};

// 2. READ: Ambil Semua Jabatan (Include Nama Departemen)
const getAllJabatan = async (req, res) => {
    try {
        // Query relasional untuk mengambil nama departemen sekaligus
        const { data, error } = await supabase
            .from('jabatan')
            .select(`
                *,
                departemen (nama_departemen)
            `)
            .order('id', { ascending: true });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllJabatan:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 3. READ: Ambil Jabatan by ID
const getJabatanById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('jabatan')
            .select(`
                *,
                departemen (nama_departemen)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Jabatan tidak ditemukan.' });

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getJabatanById:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 4. UPDATE: Ubah Data Jabatan
const updateJabatan = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // Mengambil semua field yang dikirim dari body

        // Hapus property yang tidak boleh diubah secara manual jika ada
        delete updates.id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('jabatan')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Jabatan berhasil diperbarui.', data });
    } catch (error) {
        console.error('Error updateJabatan:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui data.' });
    }
};

// 5. DELETE: Hapus Jabatan
const deleteJabatan = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('jabatan')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Jabatan berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleteJabatan:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menghapus. Data ini mungkin sedang digunakan oleh tabel Pegawai.' });
    }
};

module.exports = {
    createJabatan,
    getAllJabatan,
    getJabatanById,
    updateJabatan,
    deleteJabatan
};