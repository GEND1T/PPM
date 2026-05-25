// File: src/controllers/master/departemenController.js

const supabase = require('../../config/supabaseClient');

// 1. CREATE: Tambah Departemen Baru
const createDepartemen = async (req, res) => {
    try {
        const { nama_departemen } = req.body;

        if (!nama_departemen) {
            return res.status(400).json({ success: false, message: 'Nama departemen wajib diisi.' });
        }

        const { data, error } = await supabase
            .from('departemen')
            .insert([{ nama_departemen }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({ success: true, message: 'Departemen berhasil ditambahkan.', data });
    } catch (error) {
        console.error('Error createDepartemen:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 2. READ: Ambil Semua Departemen
const getAllDepartemen = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('departemen')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllDepartemen:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 3. READ: Ambil Departemen by ID
const getDepartemenById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('departemen')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Departemen tidak ditemukan.' });

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getDepartemenById:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 4. UPDATE: Ubah Data Departemen
const updateDepartemen = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_departemen } = req.body;

        const { data, error } = await supabase
            .from('departemen')
            .update({ nama_departemen })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Departemen berhasil diperbarui.', data });
    } catch (error) {
        console.error('Error updateDepartemen:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 5. DELETE: Hapus Departemen
const deleteDepartemen = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('departemen')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Departemen berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleteDepartemen:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menghapus. Pastikan tidak ada data yang terikat dengan departemen ini.' });
    }
};

module.exports = {
    createDepartemen,
    getAllDepartemen,
    getDepartemenById,
    updateDepartemen,
    deleteDepartemen
};