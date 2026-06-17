// File: src/controllers/master/shiftController.js

const supabase = require('../../config/supabaseClient');

// 1. CREATE: Tambah Shift Baru
const createShift = async (req, res) => {
    try {
        const {
            kode_shift, jam_masuk, jam_pulang, batas_toleransi_menit,
            batas_akhir_scan_masuk_menit, batas_akhir_scan_pulang_menit,
            is_potong_gaji_terlambat, denda_terlambat_per_menit,
            is_potong_gaji_pulang_awal, toleransi_pulang_awal_menit, denda_pulang_awal_per_menit,istetap
        } = req.body;

        if (!kode_shift || !jam_masuk || !jam_pulang) {
            return res.status(400).json({ success: false, message: 'Nama shift, jam masuk, dan jam pulang wajib diisi.' });
        }

        const { data, error } = await supabase
            .from('shifts')
            .insert([{
                kode_shift, jam_masuk, jam_pulang, batas_toleransi_menit,
                batas_akhir_scan_masuk_menit, batas_akhir_scan_pulang_menit,
                is_potong_gaji_terlambat, denda_terlambat_per_menit,
                is_potong_gaji_pulang_awal, toleransi_pulang_awal_menit, denda_pulang_awal_per_menit,istetap
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({ success: true, message: 'Shift berhasil ditambahkan.', data });
    } catch (error) {
        console.error('Error createShift:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 2. READ: Ambil Semua Shift
const getAllShifts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllShifts:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 3. READ: Ambil Shift by ID
const getShiftById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Shift tidak ditemukan.' });

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getShiftById:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 4. UPDATE: Ubah Data Shift
const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('shifts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Shift berhasil diperbarui.', data });
    } catch (error) {
        console.error('Error updateShift:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui data shift.' });
    }
};

// 5. DELETE: Hapus Shift
const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Shift berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleteShift:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menghapus. Data ini mungkin sedang digunakan oleh tabel Pegawai.' });
    }
};

module.exports = {
    createShift,
    getAllShifts,
    getShiftById,
    updateShift,
    deleteShift
};