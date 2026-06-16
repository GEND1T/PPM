const supabase = require('../../config/supabaseClient');

// =========================================================================
// A. MASTER TARGET (Katalog Harga)
// =========================================================================

// 1. Ambil Data Master Target (Bisa difilter per jabatan)
const getMasterTarget = async (req, res) => {
    try {
        const { jabatan_id, is_active } = req.query;
        let query = supabase.from('master_target').select('*, jabatan(nama_jabatan)').order('nama_target', { ascending: true });

        if (jabatan_id) query = query.eq('jabatan_id', jabatan_id);
        if (is_active !== undefined) query = query.eq('is_active', is_active);

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getMasterTarget:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil master target.' });
    }
};

// 2. Tambah/Edit Master Target Baru
const upsertMasterTarget = async (req, res) => {
    try {
        const { id, jabatan_id, nama_target, harga_satuan, is_active } = req.body;

        if (!jabatan_id || !nama_target || harga_satuan === undefined) {
            return res.status(400).json({ success: false, message: 'Data jabatan, nama target, dan harga satuan wajib diisi.' });
        }

        const payload = { jabatan_id, nama_target, harga_satuan, is_active: is_active ?? true };
        if (id) payload.id = id; // Jika ada ID, maka update

        const { data, error } = await supabase.from('master_target').upsert([payload]).select();

        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Master target berhasil disimpan.', data });
    } catch (error) {
        console.error('Error upsertMasterTarget:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan master target.' });
    }
};


// =========================================================================
// B. PENCAPAIAN TARGET HARIAN (Log Transaksi)
// =========================================================================

// 3. Input Pencapaian Harian (Otomatis hitung nominal)
const inputPencapaianHarian = async (req, res) => {
    try {
        const { tanggal, pegawai_id, master_target_id, jumlah_pencapaian } = req.body;

        if (!tanggal || !pegawai_id || !master_target_id || !jumlah_pencapaian) {
            return res.status(400).json({ success: false, message: 'Semua parameter pencapaian wajib diisi.' });
        }

        // TAHAP 1: Ambil harga satuan SAAT INI dari master_target
        const { data: master, error: errMaster } = await supabase
            .from('master_target')
            .select('harga_satuan')
            .eq('id', master_target_id)
            .single();

        if (errMaster || !master) {
            return res.status(400).json({ success: false, message: 'Master Target tidak ditemukan.' });
        }

        // TAHAP 2: Hitung nominal total riil
        const nominalTotalRiil = master.harga_satuan * jumlah_pencapaian;

        // TAHAP 3: Simpan menggunakan UPSERT agar tidak dobel input jika HRD melakukan perbaikan
        const { data, error } = await supabase
            .from('pencapaian_target_harian')
            .upsert([{ 
                tanggal, 
                pegawai_id, 
                master_target_id, 
                jumlah_pencapaian, 
                nominal_total_riil : nominalTotalRiil
            }], { 
                onConflict: 'tanggal,pegawai_id,master_target_id' 
            })
            .select();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: 'Pencapaian target berhasil dicatat.', 
            data 
        });

    } catch (error) {
        console.error('Error inputPencapaianHarian:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan pencapaian target harian.' });
    }
};

// 4. Ambil Riwayat Pencapaian (Bisa filter by tanggal & pegawai)
const getPencapaianHarian = async (req, res) => {
    try {
        const { tanggal_mulai, tanggal_selesai, pegawai_id } = req.query;
        let query = supabase
            .from('pencapaian_target_harian')
            .select(`
                id, tanggal, jumlah_pencapaian, nominal_total_riil,
                pegawai(nama),
                master_target(nama_target, harga_satuan)
            `)
            .order('tanggal', { ascending: false });

        if (pegawai_id) query = query.eq('pegawai_id', pegawai_id);
        if (tanggal_mulai && tanggal_selesai) {
            query = query.gte('tanggal', tanggal_mulai).lte('tanggal', tanggal_selesai);
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getPencapaianHarian:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data pencapaian.' });
    }
};

// 5. Hapus Pencapaian (Jika salah input dan ingin dihapus total)
const deletePencapaian = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('pencapaian_target_harian').delete().eq('id', id);
        
        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Data pencapaian berhasil dihapus.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal menghapus data pencapaian.' });
    }
};

module.exports = {
    getMasterTarget,
    upsertMasterTarget,
    inputPencapaianHarian,
    getPencapaianHarian,
    deletePencapaian
};