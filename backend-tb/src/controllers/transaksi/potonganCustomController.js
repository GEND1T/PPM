const supabase = require('../../config/supabaseClient');

const getPotonganCustom = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('potongan_custom_pegawai')
            .select(`*, pegawai(nama)`)
            .order('tanggal_diberikan', { ascending: false });

        if (error) throw error;
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal mengambil data potongan.' });
    }
};

const createPotonganCustom = async (req, res) => {
    try {
        const { pegawai_id, tanggal_diberikan, keterangan, nominal } = req.body;
        if (!pegawai_id || !tanggal_diberikan || !keterangan || !nominal) {
            return res.status(400).json({ success: false, message: 'Semua kolom wajib diisi.' });
        }

        const { error } = await supabase.from('potongan_custom_pegawai').insert([{
            pegawai_id, tanggal_diberikan, keterangan, nominal
        }]);

        if (error) throw error;
        return res.status(201).json({ success: true, message: 'Potongan berhasil ditambahkan.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal menambah potongan.' });
    }
};

const deletePotonganCustom = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('potongan_custom_pegawai').delete().eq('id', id);
        
        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Potongan berhasil dihapus.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal menghapus potongan.' });
    }
};

const updatePotonganCustom = async (req, res) => {
    try {
        const { id } = req.params;
        const { pegawai_id, tanggal_diberikan, keterangan, nominal } = req.body;
        if (!id || !pegawai_id || !tanggal_diberikan || !keterangan || !nominal) {
            return res.status(400).json({ success: false, message: 'Semua kolom wajib diisi.' });
        }

        const { error } = await supabase.from('potongan_custom_pegawai').update({
            pegawai_id, tanggal_diberikan, keterangan, nominal
        }).eq('id', id);

        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Potongan berhasil diperbarui.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal memperbarui potongan.' });
    }
};

module.exports = { getPotonganCustom, createPotonganCustom, updatePotonganCustom, deletePotonganCustom };
