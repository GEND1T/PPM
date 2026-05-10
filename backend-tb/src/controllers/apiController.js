// File: src/controllers/apiController.js

const supabase = require('../config/supabaseClient');

const updateKerapian = async (req, res) => {
    try {
        // Menerima data dari request body (dikirim oleh PWA Mandor)
        const { pegawai_id, tanggal, is_kerapian } = req.body;

        // Validasi input dasar
        if (!pegawai_id || !tanggal || typeof is_kerapian === 'undefined') {
            return res.status(400).json({ 
                success: false, 
                message: 'Data tidak lengkap. Butuh pegawai_id, tanggal, dan is_kerapian.' 
            });
        }

        // 1. Cek apakah pegawai sudah absen masuk hari ini
        const { data: absenHariIni, error: errAbsen } = await supabase
            .from('absensi')
            .select('id')
            .eq('pegawai_id', pegawai_id)
            .eq('tanggal', tanggal)
            .maybeSingle();

        if (errAbsen) throw errAbsen;
        
        if (!absenHariIni) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pegawai belum melakukan absen masuk hari ini.' 
            });
        }

        let nominalBonusKerapian = 0;

        // 2. Jika is_kerapian TRUE, cari nominalnya di tabel jabatan
        if (is_kerapian === true) {
            const { data: pegawai, error: errPegawai } = await supabase
                .from('pegawai')
                .select('jabatan(bonus_kerapian_harian)')
                .eq('id', pegawai_id)
                .single();

            if (errPegawai) throw errPegawai;
            
            // Ambil nominal dari relasi tabel
            nominalBonusKerapian = pegawai.jabatan.bonus_kerapian_harian || 0;
        }

        // 3. Update data absensi
        const { error: updateError } = await supabase
            .from('absensi')
            .update({
                is_kerapian: is_kerapian,
                bonus_kerapian: nominalBonusKerapian
            })
            .eq('id', absenHariIni.id);

        if (updateError) throw updateError;

        // Berikan respons sukses ke PWA
        return res.status(200).json({
            success: true,
            message: `Checklist kerapian berhasil diupdate.`,
            data: {
                is_kerapian: is_kerapian,
                bonus_diberikan: nominalBonusKerapian
            }
        });

    } catch (error) {
        console.error('Error di API Kerapian:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server.' 
        });
    }
};

// ==========================================
// FITUR BARU: API INPUT SPL (LEMBUR)
// ==========================================
const createSPL = async (req, res) => {
    try {
        const { pegawai_id, tanggal, menit_lembur_diizinkan, alasan_lembur, disetujui_oleh } = req.body;

        // Validasi input dasar
        if (!pegawai_id || !tanggal || typeof menit_lembur_diizinkan === 'undefined') {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap. Butuh pegawai_id, tanggal, dan menit_lembur_diizinkan.'
            });
        }

        // Gunakan UPSERT: Jika belum ada = Insert. Jika sudah ada di tanggal yang sama = Update.
        // (Syarat: constraint unique_lembur_harian pada DB harus ada, yang mana sudah kita buat sebelumnya)
        const { data, error } = await supabase
            .from('otorisasi_lembur')
            .upsert({
                pegawai_id: pegawai_id,
                tanggal: tanggal,
                menit_lembur_diizinkan: menit_lembur_diizinkan,
                alasan_lembur: alasan_lembur || 'Lembur reguler',
                disetujui_oleh: disetujui_oleh || 'Sistem HRD'
            }, { onConflict: 'pegawai_id, tanggal' }) 
            .select()
            .single();

        if (error) throw error;

        // Berikan respons sukses ke PWA
        return res.status(200).json({
            success: true,
            message: 'Surat Perintah Lembur (SPL) berhasil disimpan.',
            data: data
        });

    } catch (error) {
        console.error('Error di API Input SPL:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat menyimpan SPL.'
        });
    }
};

// ==========================================
// FITUR BARU: API TOMBOL NUKLIR (VOID ABSEN)
// ==========================================
const voidAbsensi = async (req, res) => {
    try {
        const { pegawai_id, tanggal, alasan_void } = req.body;

        // Validasi input
        if (!pegawai_id || !tanggal) {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap. Butuh pegawai_id dan tanggal.'
            });
        }

        // 1. Cari data absensi target
        const { data: absenTarget, error: errCari } = await supabase
            .from('absensi')
            .select('id, status')
            .eq('pegawai_id', pegawai_id)
            .eq('tanggal', tanggal)
            .maybeSingle();

        if (errCari) throw errCari;

        if (!absenTarget) {
            return res.status(404).json({
                success: false,
                message: 'Data absensi tidak ditemukan pada tanggal tersebut.'
            });
        }

        // 2. EKSEKUSI TOMBOL NUKLIR: Hanguskan semua nilai finansialnya
        const { error: errVoid } = await supabase
            .from('absensi')
            .update({
                status: 'void',
                upah_harian: 0,
                bonus_kedisiplinan: 0,
                bonus_kerapian: 0,
                upah_lembur: 0,
                denda: 0 // Denda dinolkan karena gajinya saja sudah tidak ada
                // Catatan: Kamu bisa menambahkan kolom 'keterangan' di tabel absensi 
                // jika ingin menyimpan variabel alasan_void ke database.
            })
            .eq('id', absenTarget.id);

        if (errVoid) throw errVoid;

        // Catat ke terminal server untuk audit log
        console.log(`☢️ [VOID WARNING] Absensi PIN/ID ${pegawai_id} pada ${tanggal} telah di-VOID. Alasan: ${alasan_void || 'Tidak ada alasan'}`);

        return res.status(200).json({
            success: true,
            message: 'Absensi berhasil dibatalkan (VOID). Seluruh hak finansial hari ini dihanguskan.'
        });

    } catch (error) {
        console.error('Error di API Void Absensi:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat melakukan Void.'
        });
    }
};
// ==========================================
// FITUR BARU: API LIVE DASHBOARD
// ==========================================
const getLiveDashboard = async (req, res) => {
    try {
        // Ambil tanggal hari ini (Waktu Lokal server)
        const today = new Date().toLocaleDateString('en-CA'); 

        // 1. Tarik semua data pegawai aktif beserta nama jabatannya
        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, nama, pin_mesin, jabatan(nama_jabatan)');

        if (errPegawai) throw errPegawai;

        // 2. Tarik semua data absensi HARI INI
        const { data: absenHariIni, error: errAbsen } = await supabase
            .from('absensi')
            .select('pegawai_id, waktu_awal, waktu_akhir, status')
            .eq('tanggal', today);

        if (errAbsen) throw errAbsen;

        // Variabel untuk menghitung statistik Dashboard
        let totalPegawai = listPegawai.length;
        let totalHadirTepatWaktu = 0;
        let totalTerlambat = 0;
        let totalBelumHadir = 0;
        let totalVoid = 0;

        // 3. Gabungkan data (Mapping)
        const hasilDashboard = listPegawai.map(pegawai => {
            // Cari apakah pegawai ini ada di tabel absen hari ini
            const absen = absenHariIni.find(a => a.pegawai_id === pegawai.id);

            let statusHariIni = 'belum_hadir';
            let jamMasuk = '-';
            let jamPulang = '-';

            if (absen) {
                statusHariIni = absen.status;
                jamMasuk = absen.waktu_awal || '-';
                jamPulang = absen.waktu_akhir || '-';

                // Hitung statistik
                if (statusHariIni === 'intime' || statusHariIni === 'ontime') {
                    totalHadirTepatWaktu++;
                } else if (statusHariIni === 'late') {
                    totalTerlambat++;
                } else if (statusHariIni === 'void') {
                    totalVoid++;
                }
            } else {
                totalBelumHadir++;
            }

            return {
                id_pegawai: pegawai.id,
                nama: pegawai.nama,
                jabatan: pegawai.jabatan ? pegawai.jabatan.nama_jabatan : 'Tidak Diketahui',
                jam_masuk: jamMasuk,
                jam_pulang: jamPulang,
                status: statusHariIni
            };
        });

        // 4. Kirim respons JSON ke PWA
        return res.status(200).json({
            success: true,
            tanggal: today,
            statistik: {
                total_pegawai: totalPegawai,
                hadir_tepat_waktu: totalHadirTepatWaktu,
                terlambat: totalTerlambat,
                belum_hadir: totalBelumHadir,
                dibatalkan_void: totalVoid
            },
            data_karyawan: hasilDashboard
        });

    } catch (error) {
        console.error('Error di API Live Dashboard:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil data Live Dashboard.'
        });
    }
};

// Pastikan SEMUA fungsi diekspor
module.exports = { updateKerapian, createSPL, voidAbsensi, getLiveDashboard };