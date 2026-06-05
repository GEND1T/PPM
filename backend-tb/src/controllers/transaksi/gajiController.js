const supabase = require('../../config/supabaseClient');

// 1. GET: Ambil daftar riwayat penggajian (Sudah disesuaikan untuk format Frontend)
const getAllGaji = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('penggajian')
            .select(`
                id, periode_bulan, periode_tahun, 
                gaji_dasar, total_bonus, total_potongan, total_gaji, status_pembayaran,
                pegawai (nama, jabatan (nama_jabatan))
            `)
            .order('periode_tahun', { ascending: false })
            .order('periode_bulan', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllGaji:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data gaji' });
    }
};

// 2. POST: Hitung dan buat Slip Gaji baru (Generate Payroll Engine)
const generateGaji = async (req, res) => {
    try {
        const { pegawai_id, periode_bulan, periode_tahun } = req.body;

        if (!pegawai_id || !periode_bulan || !periode_tahun) {
            return res.status(400).json({ success: false, message: 'Data periode dan pegawai tidak lengkap' });
        }

        // --- TAHAP 1: Ambil Profil Gaji & Tunjangan dari Jabatan ---
        const { data: dataPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, jabatan (gaji_pokok, tunjangan)') // Asumsi tabel jabatan memiliki kolom ini
            .eq('id', pegawai_id)
            .single();

        if (errPegawai || !dataPegawai) throw new Error('Data pegawai atau jabatan tidak ditemukan');

        const gajiPokok = dataPegawai.jabatan?.gaji_pokok || 0;
        const tunjangan = dataPegawai.jabatan?.tunjangan || 0;

        // --- TAHAP 2: Ambil Rekap Absensi Bulan Tersebut ---
        // Membuat string YYYY-MM (misal: "2026-06") untuk filter LIKE di Supabase
        const bulanStr = String(periode_bulan).padStart(2, '0');
        const prefixPeriode = `${periode_tahun}-${bulanStr}`; 

        const { data: dataAbsen, error: errAbsen } = await supabase
            .from('absensi')
            .select('status, status_lembur')
            .eq('pegawai_id', pegawai_id)
            .like('tanggal', `${prefixPeriode}%`); // Mencari semua tanggal di bulan tersebut

        if (errAbsen) throw errAbsen;

        // --- TAHAP 3: Engine Perhitungan (Silakan sesuaikan nominal kebijakannya) ---
        let dendaTerlambat = 0;
        let dendaVoid = 0;
        let bonusLembur = 0;

        // Nominal Kebijakan Perusahaan (Bisa diubah sesuai aturan HRD)
        const TARIF_TERLAMBAT = 25000; // Rp 25.000 per terlambat
        const TARIF_VOID = 100000;     // Rp 100.000 per alpha/void
        const TARIF_LEMBUR = 50000;    // Rp 50.000 per hari lembur (simplifikasi)

        // Looping seluruh data absensi di bulan itu
        if (dataAbsen && dataAbsen.length > 0) {
            for (const absen of dataAbsen) {
                // Hitung Potongan
                if (absen.status === 'late') {
                    dendaTerlambat += TARIF_TERLAMBAT;
                } else if (absen.status === 'void') {
                    dendaVoid += TARIF_VOID;
                }

                // Hitung Lembur (Jika status_lembur memiliki isi angka menit atau "Lembur")
                if (absen.status_lembur && absen.status_lembur !== '-') {
                    // Untuk tahap awal, kita hitung per hari lembur = flat rate
                    bonusLembur += TARIF_LEMBUR; 
                }
            }
        }

        // --- TAHAP 4: Kalkulasi Hasil Akhir ---
        const totalBonusKalkulasi = tunjangan + bonusLembur;
        const totalPotonganKalkulasi = dendaTerlambat + dendaVoid;
        
        // Rumus Take Home Pay
        const gajiBersih = (gajiPokok + totalBonusKalkulasi) - totalPotonganKalkulasi;

        // --- TAHAP 5: Simpan ke Database ---
        const { data: savedGaji, error: errSave } = await supabase
            .from('penggajian')
            .insert([{ 
                pegawai_id, 
                periode_bulan, 
                periode_tahun, 
                gaji_dasar: gajiPokok,
                total_bonus: totalBonusKalkulasi,
                total_potongan: totalPotonganKalkulasi,
                total_gaji: gajiBersih, // Take Home Pay
                status_pembayaran: 'Pending'
            }])
            .select()
            .single();

        if (errSave) {
            // Cegah duplikasi data jika HRD men-generate 2x di bulan yang sama (jika ada UNIQUE constraint)
            if (errSave.code === '23505') {
                return res.status(400).json({ success: false, message: 'Slip gaji untuk periode ini sudah pernah dibuat' });
            }
            throw errSave;
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Slip gaji berhasil dihitung dan dibuat', 
            data: savedGaji 
        });

    } catch (error) {
        console.error('Error generateGaji:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal melakukan generate gaji. Pastikan Master Jabatan memiliki Nominal Gaji Pokok.' });
    }
};

module.exports = { getAllGaji, generateGaji };