// File: src/controllers/master/polaRotasiController.js

const supabase = require('../../config/supabaseClient');

// 1. GET: Ambil semua Pola Rotasi beserta Detail Hari
const getAllPola = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pola_rotasi_shift')
            .select(`
                *,
                detail_pola_rotasi (
                    id, urutan_hari, shift_id,
                    shifts (id, kode_shift, jam_masuk, jam_pulang)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Urutkan detail_pola_rotasi berdasarkan urutan_hari
        const formattedData = (data || []).map(pola => ({
            ...pola,
            detail_pola_rotasi: (pola.detail_pola_rotasi || []).sort((a, b) => a.urutan_hari - b.urutan_hari)
        }));

        return res.status(200).json({ success: true, data: formattedData });
    } catch (error) {
        console.error('Error getAllPola:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data pola rotasi.' });
    }
};

// 2. POST: Tambah Pola Rotasi Baru beserta Detail Hari
const createPola = async (req, res) => {
    try {
        const { nama_pola, jumlah_hari_siklus, keterangan, details } = req.body;

        if (!nama_pola || !jumlah_hari_siklus || !details || !Array.isArray(details)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nama pola, jumlah hari siklus, dan rincian detail hari wajib diisi.' 
            });
        }

        // A. Insert Header Pola
        const { data: polaHeader, error: errHeader } = await supabase
            .from('pola_rotasi_shift')
            .insert([{
                nama_pola,
                jumlah_hari_siklus: Number(jumlah_hari_siklus),
                keterangan
            }])
            .select()
            .single();

        if (errHeader) throw errHeader;

        // B. Insert Detail Hari
        const detailPayload = details.map(d => ({
            pola_id: polaHeader.id,
            urutan_hari: Number(d.urutan_hari),
            shift_id: d.shift_id && d.shift_id !== 'OFF' ? Number(d.shift_id) : null
        }));

        const { error: errDetail } = await supabase
            .from('detail_pola_rotasi')
            .insert(detailPayload);

        if (errDetail) throw errDetail;

        return res.status(201).json({ 
            success: true, 
            message: 'Pola rotasi shift berhasil dibuat.',
            data: polaHeader 
        });

    } catch (error) {
        console.error('Error createPola:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal membuat pola rotasi.' });
    }
};

// 3. PUT: Update Pola Rotasi
const updatePola = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_pola, jumlah_hari_siklus, keterangan, details } = req.body;

        // A. Update Header
        const { data: updatedPola, error: errHeader } = await supabase
            .from('pola_rotasi_shift')
            .update({
                nama_pola,
                jumlah_hari_siklus: Number(jumlah_hari_siklus),
                keterangan
            })
            .eq('id', id)
            .select()
            .single();

        if (errHeader) throw errHeader;

        // B. Hapus detail lama & masukkan detail baru jika dikirim
        if (details && Array.isArray(details)) {
            await supabase.from('detail_pola_rotasi').delete().eq('pola_id', id);

            const detailPayload = details.map(d => ({
                pola_id: id,
                urutan_hari: Number(d.urutan_hari),
                shift_id: d.shift_id && d.shift_id !== 'OFF' ? Number(d.shift_id) : null
            }));

            const { error: errDetail } = await supabase
                .from('detail_pola_rotasi')
                .insert(detailPayload);

            if (errDetail) throw errDetail;
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Pola rotasi shift berhasil diperbarui.',
            data: updatedPola 
        });

    } catch (error) {
        console.error('Error updatePola:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui pola rotasi.' });
    }
};

// 4. DELETE: Hapus Pola Rotasi
const deletePola = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('pola_rotasi_shift')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: 'Pola rotasi shift berhasil dihapus.' 
        });

    } catch (error) {
        console.error('Error deletePola:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menghapus pola rotasi.' });
    }
};

module.exports = { getAllPola, createPola, updatePola, deletePola };
