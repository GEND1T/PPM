// File: src/controllers/master/pegawaiController.js

const supabase = require('../../config/supabaseClient');

// File: src/controllers/master/pegawaiController.js

// 1. CREATE: Tambah Pegawai Baru
const createPegawai = async (req, res) => {
    try {
        const {
            nama, pin_mesin, jabatan_id, default_shift_id, tanggal_bergabung,
            nik, bpjs, jenis_kelamin, alamat, tempat_lahir, tanggal_lahir, no_hp, email // <--- Tambahan variabel baru
        } = req.body;

        if (!nama || !pin_mesin) {
            return res.status(400).json({ success: false, message: 'Nama dan PIN Mesin wajib diisi.' });
        }

        const { data, error } = await supabase
            .from('pegawai')
            .insert([{
                nama, pin_mesin, jabatan_id, default_shift_id, 
                nik, bpjs, jenis_kelamin, alamat, tempat_lahir, tanggal_lahir, no_hp, email, // <--- Masukkan ke database
                ...(tanggal_bergabung && { tanggal_bergabung })
            }])
            .select()
            .single();

        if (error) {
            // Penanganan error khusus jika NIK atau Email sudah terdaftar
            if (error.code === '23505') { 
                return res.status(400).json({ success: false, message: 'Gagal! NIK, Email, atau PIN Mesin sudah digunakan.' });
            }
            throw error;
        }

        return res.status(201).json({ success: true, message: 'Pegawai berhasil ditambahkan.', data });
    } catch (error) {
        console.error('Error createPegawai:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 2. READ: Ambil Semua Pegawai (Dengan Nested Join)
const getAllPegawai = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pegawai')
            .select(`
                *,
                jabatan (
                    nama_jabatan,
                    departemen (nama_departemen)
                ),
                shifts (kode_shift),
                pola_rotasi_shift (id, nama_pola, jumlah_hari_siklus)
            `)
            .order('nama', { ascending: true });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllPegawai:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 3. READ: Ambil Pegawai by ID
const getPegawaiById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('pegawai')
            .select(`
                *,
                jabatan (
                    nama_jabatan,
                    departemen (nama_departemen)
                ),
                shifts (kode_shift),
                pola_rotasi_shift (id, nama_pola, jumlah_hari_siklus)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan.' });

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getPegawaiById:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
};

// 4. UPDATE: Ubah Data Pegawai
const updatePegawai = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.created_at;

        const { data, error } = await supabase
            .from('pegawai')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Data pegawai berhasil diperbarui.', data });
    } catch (error) {
        console.error('Error updatePegawai:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui data pegawai.' });
    }
};

// 5. DELETE: Hapus Pegawai
const deletePegawai = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('pegawai')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Pegawai berhasil dihapus.' });
    } catch (error) {
        console.error('Error deletePegawai:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menghapus pegawai. Data mungkin terikat dengan tabel absensi.' });
    }
};

module.exports = {
    createPegawai,
    getAllPegawai,
    getPegawaiById,
    updatePegawai,
    deletePegawai
};