// File: src/controllers/master/shiftController.js

const supabase = require('../../config/supabaseClient');

// 1. CREATE: Tambah Shift Baru
const createShift = async (req, res) => {
    try {
        const {
            kode_shift, jam_masuk, jam_pulang, batas_toleransi_menit,
            batas_akhir_scan_masuk_menit, batas_akhir_scan_pulang_menit,
            is_potong_gaji_terlambat, denda_terlambat_per_menit,
            is_potong_gaji_pulang_awal, toleransi_pulang_awal_menit, denda_pulang_awal_per_menit, istetap,
            batas_maksimal_lembur_menit, lintas_hari, is_batas_scan
        } = req.body;

        if (!kode_shift || !jam_masuk || !jam_pulang) {
            return res.status(400).json({ success: false, message: 'Nama shift, jam masuk, dan jam pulang wajib diisi.' });
        }

        const insertPayload = {
            kode_shift, jam_masuk, jam_pulang, batas_toleransi_menit,
            batas_akhir_scan_masuk_menit, batas_akhir_scan_pulang_menit,
            is_potong_gaji_terlambat, denda_terlambat_per_menit,
            is_potong_gaji_pulang_awal, toleransi_pulang_awal_menit, denda_pulang_awal_per_menit, istetap
        };
        if (batas_maksimal_lembur_menit !== undefined) insertPayload.batas_maksimal_lembur_menit = batas_maksimal_lembur_menit;
        if (lintas_hari !== undefined) insertPayload.lintas_hari = lintas_hari;
        if (is_batas_scan !== undefined) insertPayload.is_batas_scan = is_batas_scan;

        const { data, error } = await supabase
            .from('shifts')
            .insert([insertPayload])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({ success: true, message: 'Shift berhasil ditambahkan.', data });
    } catch (error) {
        console.error('Error createShift:', error.message || error);
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
        const {
            kode_shift,
            jam_masuk,
            jam_pulang,
            batas_toleransi_menit,
            batas_akhir_scan_masuk_menit,
            batas_akhir_scan_pulang_menit,
            is_potong_gaji_terlambat,
            denda_terlambat_per_menit,
            is_potong_gaji_pulang_awal,
            toleransi_pulang_awal_menit,
            denda_pulang_awal_per_menit,
            istetap,
            batas_maksimal_lembur_menit,
            lintas_hari,
            is_batas_scan
        } = req.body;

        const updates = {};
        if (kode_shift !== undefined) updates.kode_shift = kode_shift;
        if (jam_masuk !== undefined) updates.jam_masuk = jam_masuk;
        if (jam_pulang !== undefined) updates.jam_pulang = jam_pulang;
        if (batas_toleransi_menit !== undefined) updates.batas_toleransi_menit = batas_toleransi_menit;
        if (batas_akhir_scan_masuk_menit !== undefined) updates.batas_akhir_scan_masuk_menit = batas_akhir_scan_masuk_menit;
        if (batas_akhir_scan_pulang_menit !== undefined) updates.batas_akhir_scan_pulang_menit = batas_akhir_scan_pulang_menit;
        if (is_potong_gaji_terlambat !== undefined) updates.is_potong_gaji_terlambat = is_potong_gaji_terlambat;
        if (denda_terlambat_per_menit !== undefined) updates.denda_terlambat_per_menit = denda_terlambat_per_menit;
        if (is_potong_gaji_pulang_awal !== undefined) updates.is_potong_gaji_pulang_awal = is_potong_gaji_pulang_awal;
        if (toleransi_pulang_awal_menit !== undefined) updates.toleransi_pulang_awal_menit = toleransi_pulang_awal_menit;
        if (denda_pulang_awal_per_menit !== undefined) updates.denda_pulang_awal_per_menit = denda_pulang_awal_per_menit;
        if (istetap !== undefined) updates.istetap = istetap;
        if (batas_maksimal_lembur_menit !== undefined) updates.batas_maksimal_lembur_menit = batas_maksimal_lembur_menit;
        if (lintas_hari !== undefined) updates.lintas_hari = lintas_hari;
        if (is_batas_scan !== undefined) updates.is_batas_scan = is_batas_scan;

        const { data, error } = await supabase
            .from('shifts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Shift berhasil diperbarui.', data });
    } catch (error) {
        console.error('Error updateShift:', error.message || error);
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