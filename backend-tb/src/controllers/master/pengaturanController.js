// File: src/controllers/master/pengaturanController.js

const supabase = require('../../config/supabaseClient');

// In-memory fallback offset (default 0 menit)
let inMemoryOffsetMesin = 0;

// Helper internal untuk memuat offset mesin dari DB/in-memory
async function getOffsetMesinInternal() {
    try {
        const { data, error } = await supabase
            .from('pengaturan_sistem')
            .select('nilai')
            .eq('kunci', 'offset_waktu_mesin_menit')
            .maybeSingle();

        if (!error && data && data.nilai !== undefined && data.nilai !== null) {
            const parsed = parseInt(data.nilai, 10);
            if (!isNaN(parsed)) {
                inMemoryOffsetMesin = parsed;
                return parsed;
            }
        }
    } catch (err) {
        console.warn('[PENGATURAN] Gagal membaca offset dari DB, menggunakan in-memory fallback:', err.message);
    }
    return inMemoryOffsetMesin;
}

// 1. READ: GET /api/pengaturan/mesin
const getPengaturanMesin = async (req, res) => {
    try {
        const offset = await getOffsetMesinInternal();
        return res.status(200).json({
            success: true,
            data: {
                offset_waktu_mesin_menit: offset
            }
        });
    } catch (error) {
        console.error('Error getPengaturanMesin:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil pengaturan mesin absensi.'
        });
    }
};

// 2. UPDATE: PUT /api/pengaturan/mesin
const updatePengaturanMesin = async (req, res) => {
    try {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                // parse error fallback
            }
        }

        const rawVal = body ? (body.offset_waktu_mesin_menit !== undefined ? body.offset_waktu_mesin_menit : body.offset) : undefined;

        if (rawVal === undefined || rawVal === null || rawVal === '' || isNaN(Number(rawVal))) {
            return res.status(400).json({
                success: false,
                message: 'Nilai offset_waktu_mesin_menit harus berupa angka (menit).'
            });
        }

        const offsetInt = parseInt(rawVal, 10);
        inMemoryOffsetMesin = offsetInt;

        // Coba simpan ke Supabase `pengaturan_sistem`
        try {
            const { error: upsertError } = await supabase
                .from('pengaturan_sistem')
                .upsert([
                    {
                        kunci: 'offset_waktu_mesin_menit',
                        nilai: String(offsetInt),
                        keterangan: 'Offset penyesuaian waktu mesin absensi dalam menit'
                    }
                ], { onConflict: 'kunci' });

            if (upsertError) {
                console.warn('[PENGATURAN] Upsert ke pengaturan_sistem error, tersimpan di in-memory:', upsertError.message);
            }
        } catch (dbErr) {
            console.warn('[PENGATURAN] DB Error saat simpan pengaturan, tersimpan di in-memory:', dbErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Pengaturan offset waktu mesin absensi berhasil diperbarui.',
            data: {
                offset_waktu_mesin_menit: offsetInt
            }
        });

    } catch (error) {
        console.error('Error updatePengaturanMesin:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat memperbarui pengaturan.'
        });
    }
};

module.exports = {
    getPengaturanMesin,
    updatePengaturanMesin,
    getOffsetMesinInternal
};
