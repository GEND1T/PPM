const supabase = require('../../config/supabaseClient');

const getBonusCustom = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bonus_custom_pegawai')
            .select(`*, pegawai(nama)`)
            .order('tanggal_diberikan', { ascending: false });

        if (error) throw error;
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal mengambil data bonus.' });
    }
};

const createBonusCustom = async (req, res) => {
    try {
        const { pegawai_id, tanggal_diberikan, keterangan, nominal } = req.body;
        if (!pegawai_id || !tanggal_diberikan || !keterangan || !nominal) {
            return res.status(400).json({ success: false, message: 'Semua kolom wajib diisi.' });
        }

        const { error } = await supabase.from('bonus_custom_pegawai').insert([{
            pegawai_id, tanggal_diberikan, keterangan, nominal
        }]);

        if (error) throw error;
        return res.status(201).json({ success: true, message: 'Bonus berhasil ditambahkan.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal menambah bonus.' });
    }
};

const deleteBonusCustom = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('bonus_custom_pegawai').delete().eq('id', id);
        
        if (error) throw error;
        return res.status(200).json({ success: true, message: 'Bonus berhasil dihapus.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal menghapus bonus.' });
    }
};

module.exports = { getBonusCustom, createBonusCustom, deleteBonusCustom };