const supabase = require('../../config/supabaseClient');

// 1. GET: Ambil daftar riwayat penggajian (Sudah disesuaikan untuk format Frontend)
const getAllGaji = async (req, res) => {
    try {
        // Tangkap filter dari frontend (contoh: ?filter=2026-06)
        const { filter } = req.query;

        // Siapkan kerangka Query ke Supabase
        let query = supabase
            .from('penggajian')
            .select(`
                id, periode_bulan, periode_tahun, 
                gaji_dasar, total_bonus, total_potongan, total_gaji, status_pembayaran,
                pegawai!inner (nama, jabatan (nama_jabatan))
            `)
            .order('periode_tahun', { ascending: false })
            .order('periode_bulan', { ascending: false });

        // Jika HRD memilih bulan spesifik di kalender frontend
        if (filter) {
            const [tahun, bulan] = filter.split('-'); // Memecah "2026-06"
            if (tahun && bulan) {
                query = query
                    .eq('periode_tahun', parseInt(tahun))
                    .eq('periode_bulan', parseInt(bulan));
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllGaji:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data gaji bulanan' });
    }
};

// GET: Ambil Rekap Gaji Harian (Berdasarkan Tabel Absensi)
const getRekapHarian = async (req, res) => {
    try {
        // Tangkap parameter tanggal dari URL (contoh: /api/v1/gaji/harian?tanggal=2026-06-05)
        const { tanggal } = req.query;

        if (!tanggal) {
            return res.status(400).json({ success: false, message: 'Parameter tanggal wajib diisi' });
        }

        const { data, error } = await supabase
            .from('absensi')
            .select(`
                id, tanggal, status,
                upah_harian, bonus_kedisiplinan, bonus_kerapian, upah_lembur, denda,
                pegawai!inner (nama, jabatan (nama_jabatan))
            `)
            .eq('tanggal', tanggal);

        if (error) throw error;

        // Transformasi data agar persis dengan format RekapGajiData di Frontend
        const formattedData = data.map(absen => {
            const upahDasar = absen.upah_harian || 0;
            const totalBonusHarian = (absen.bonus_kedisiplinan || 0) + (absen.bonus_kerapian || 0) + (absen.upah_lembur || 0);
            const totalPotonganHarian = absen.denda || 0;
            const thpHarian = (upahDasar + totalBonusHarian) - totalPotonganHarian;

            return {
                id: absen.id,
                nama: absen.pegawai?.nama || 'Tanpa Nama',
                jabatan: absen.pegawai?.jabatan?.nama_jabatan || '-',
                gaji_dasar: upahDasar,
                total_bonus: totalBonusHarian,
                total_potongan: totalPotonganHarian,
                gaji_bersih: thpHarian > 0 ? thpHarian : 0, // Cegah nilai minus
                status: absen.status === 'void' ? 'Batal' : 'Selesai' 
            };
        });

        return res.status(200).json({ success: true, data: formattedData });

    } catch (error) {
        console.error('Error getRekapHarian:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil rekap gaji harian' });
    }
};


// POST: Hitung dan buat Slip Gaji baru (Generate Payroll Engine - Versi Lanjut)
const generateGaji = async (req, res) => {
    try {
        const { pegawai_id, periode_bulan, periode_tahun } = req.body;

        if (!pegawai_id || !periode_bulan || !periode_tahun) {
            return res.status(400).json({ success: false, message: 'Data periode dan pegawai tidak lengkap' });
        }

        // --- TAHAP 1: Ambil Profil Gaji & Tunjangan dari Jabatan ---
        const { data: dataPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            // Tambahkan pengambilan 'tanggal_masuk' (sesuaikan nama kolom di DB mu)
            .select('id, tanggal_bergabung, jabatan_id (upah_per_kehadiran, tunjangan)') 
            .eq('id', pegawai_id)
            .single();

        if (errPegawai || !dataPegawai) throw new Error('Data pegawai atau jabatan tidak ditemukan');

        const gajiPokok = dataPegawai.jabatan?.upah_per_kehadiran || 0;
        const tunjanganTetap = dataPegawai.jabatan?.tunjangan || 0;

        // --- TAHAP 2: Ambil Rekap Absensi Bulan Tersebut ---
        const bulanStr = String(periode_bulan).padStart(2, '0');
        const prefixPeriode = `${periode_tahun}-${bulanStr}`; 

        const { data: dataAbsen, error: errAbsen } = await supabase
            .from('absensi')
            .select('status, status_lembur')
            .eq('pegawai_id', pegawai_id)
            .like('tanggal', `${prefixPeriode}%`);

        if (errAbsen) throw errAbsen;

        // --- TAHAP 3: Hitung Komponen dari Absensi ---
        let dendaTerlambat = 0;
        let dendaVoid = 0;
        let totalBonusLembur = 0;
        
        // Asumsi tambahan (opsional): Hitung berapa kali tepat waktu untuk bonus
        let kaliTepatWaktu = 0; 

        // Nominal Kebijakan Perusahaan
        const TARIF_TERLAMBAT = 25000; 
        const TARIF_VOID = 100000;     
        const TARIF_LEMBUR = 50000;    
        const BONUS_KERAJINAN_HARIAN = 10000; 

        if (dataAbsen && dataAbsen.length > 0) {
            for (const absen of dataAbsen) {
                // Evaluasi Status Kehadiran
                if (absen.status === 'late') {
                    dendaTerlambat += TARIF_TERLAMBAT;
                } else if (absen.status === 'void') {
                    dendaVoid += TARIF_VOID;
                } else if (absen.status === 'intime' || absen.status === 'ontime') {
                    kaliTepatWaktu++;
                }

                // Hitung Lembur (Flat rate sementara)
                if (absen.status_lembur && absen.status_lembur !== '-') {
                    totalBonusLembur += TARIF_LEMBUR; 
                }
            }
        }

        // --- TAHAP 4: Kalkulasi Tunjangan Loyalitas ---
        let tunjanganLoyalitas = 0;
        
        if (dataPegawai.tanggal_masuk) {
            const tglMasuk = new Date(dataPegawai.tanggal_masuk);
            const hariIni = new Date();
            const masaKerjaTahun = hariIni.getFullYear() - tglMasuk.getFullYear();

            // Contoh aturan loyalitas:
            if (masaKerjaTahun >= 10) tunjanganLoyalitas = 1000000;
            else if (masaKerjaTahun >= 5) tunjanganLoyalitas = 500000;
        }

        // --- TAHAP 5: Rakit JSON Komponen Dinamis ---
        
        // Hitung bonus harian dari absensi
        const totalBonusKerajinan = kaliTepatWaktu * BONUS_KERAJINAN_HARIAN;

        // Buat objek JSONB untuk Bonus
        const rincianBonus = {
            tunjangan_tetap_jabatan: tunjanganTetap,
            tunjangan_loyalitas: tunjanganLoyalitas,
            bonus_lembur: totalBonusLembur,
            bonus_kerajinan: totalBonusKerajinan
            // thr: ... (bisa ditambahkan nanti)
        };

        // Buat objek JSONB untuk Potongan
        const rincianPotongan = {
            denda_keterlambatan: dendaTerlambat,
            denda_alpha_void: dendaVoid
            // cicilan_kasbon: ... (bisa ditambahkan nanti)
        };

        // Hitung akumulasi dari isi objek (agar rapi dan tidak manual)
        const totalSemuaBonus = Object.values(rincianBonus).reduce((acc, curr) => acc + (curr || 0), 0);
        const totalSemuaPotongan = Object.values(rincianPotongan).reduce((acc, curr) => acc + (curr || 0), 0);

        // --- TAHAP 6: Kalkulasi Take Home Pay ---
        const gajiBersih = (gajiPokok + totalSemuaBonus) - totalSemuaPotongan;

        // --- TAHAP 7: Simpan ke Database (Tabel Penggajian) ---
        const { data: savedGaji, error: errSave } = await supabase
            .from('penggajian')
            .insert([{ 
                pegawai_id, 
                periode_bulan, 
                periode_tahun, 
                gaji_dasar: gajiPokok,
                
                // Masukkan format JSON-nya
                rincian_bonus: rincianBonus,
                rincian_potongan: rincianPotongan,
                
                total_bonus: totalSemuaBonus,
                total_potongan: totalSemuaPotongan,
                total_gaji: gajiBersih, 
                status_pembayaran: 'Pending'
            }])
            .select()
            .single();

        if (errSave) {
            if (errSave.code === '23505') { // Constraint Unique dilanggar
                return res.status(400).json({ success: false, message: 'Slip gaji untuk periode dan pegawai ini sudah pernah diterbitkan.' });
            }
            throw errSave;
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Slip gaji berhasil dikalkulasi dan diterbitkan', 
            data: savedGaji 
        });

    } catch (error) {
        console.error('Error generateGaji:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal melakukan generate gaji. Pastikan Master Jabatan lengkap dan query tanggal valid.' });
    }
}

// HELPER: Mesin Penerjemah "2026-W23" menjadi Rentang Tanggal (Senin - Minggu)
const getISOWeekDateRange = (year, week) => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const ISOweekEnd = new Date(ISOweekStart);
    ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
    
    const format = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    return { start: format(ISOweekStart), end: format(ISOweekEnd) };
};

// GET: Ambil Rekap Mingguan
const getRekapMingguan = async (req, res) => {
    try {
        const { filter } = req.query; // Akan menerima "2026-W23" dari frontend

        let query = supabase
            .from('rekap_mingguan')
            .select(`
                id, tanggal_mulai, tanggal_akhir, 
                total_hari_hadir, total_gaji_pokok_mingguan, 
                total_bonus_kerapian_mingguan, total_bonus_disiplin_mingguan, 
                total_denda_mingguan, total_pendapatan_bersih_mingguan,
                pegawai (nama, jabatan (nama_jabatan))
            `)
            .order('tanggal_akhir', { ascending: false });

        // Jika HRD memilih minggu tertentu di kalender
        if (filter) {
            const [yearStr, weekStr] = filter.split('-W');
            if (yearStr && weekStr) {
                const range = getISOWeekDateRange(parseInt(yearStr), parseInt(weekStr));
                
                // Minta Supabase memfilter tanggal yang masuk dalam rentang minggu tersebut
                query = query
                    .gte('tanggal_mulai', range.start)
                    .lte('tanggal_akhir', range.end);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getRekapMingguan:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil rekap mingguan' });
    }
};

// POST: Generate Gaji Massal (Seluruh Karyawan)
const generateGajiMassal = async (req, res) => {
    try {
        const { periode_bulan, periode_tahun } = req.body;

        // 1. Validasi Input (Hanya butuh bulan dan tahun)
        if (!periode_bulan || !periode_tahun) {
            return res.status(400).json({ success: false, message: 'Data periode bulan dan tahun wajib diisi!' });
        }

        // 2. Ambil semua karyawan beserta data jabatannya
        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            // Pastikan kolom tanggal_masuk ada di tabel pegawai Anda
            .select('id, tanggal_masuk, jabatan (gaji_pokok, tunjangan)');
            
        if (errPegawai) throw errPegawai;

        let berhasil = 0;
        let gagal = 0;

        // 3. Looping perhitungan untuk SEMUA karyawan
        for (const pegawai of listPegawai) {
            try {
                const gajiPokok = pegawai.jabatan?.gaji_pokok || 0;
                const tunjanganTetap = pegawai.jabatan?.tunjangan || 0;

                // --- Kalkulasi Absensi ---
                const bulanStr = String(periode_bulan).padStart(2, '0');
                const prefixPeriode = `${periode_tahun}-${bulanStr}`; 

                const { data: dataAbsen } = await supabase
                    .from('absensi')
                    .select('status, status_lembur')
                    .eq('pegawai_id', pegawai.id)
                    .like('tanggal', `${prefixPeriode}%`);

                let dendaTerlambat = 0;
                let dendaVoid = 0;
                let totalBonusLembur = 0;
                let kaliTepatWaktu = 0; 

                // Standar Nominal (Sesuaikan dengan kebijakan T-Be)
                const TARIF_TERLAMBAT = 25000; 
                const TARIF_VOID = 100000;     
                const TARIF_LEMBUR = 50000;    
                const BONUS_KERAJINAN_HARIAN = 10000; 

                if (dataAbsen && dataAbsen.length > 0) {
                    for (const absen of dataAbsen) {
                        if (absen.status === 'late') dendaTerlambat += TARIF_TERLAMBAT;
                        else if (absen.status === 'void') dendaVoid += TARIF_VOID;
                        else if (absen.status === 'intime' || absen.status === 'ontime') kaliTepatWaktu++;

                        if (absen.status_lembur && absen.status_lembur !== '-') {
                            totalBonusLembur += TARIF_LEMBUR; 
                        }
                    }
                }

                // --- Kalkulasi Tunjangan Loyalitas ---
                let tunjanganLoyalitas = 0;
                if (pegawai.tanggal_masuk) {
                    const tglMasuk = new Date(pegawai.tanggal_masuk);
                    const masaKerjaTahun = new Date().getFullYear() - tglMasuk.getFullYear();
                    if (masaKerjaTahun >= 10) tunjanganLoyalitas = 1000000;
                    else if (masaKerjaTahun >= 5) tunjanganLoyalitas = 500000;
                }

                // --- Rakit JSONB untuk Bonus dan Potongan ---
                const rincianBonus = {
                    tunjangan_tetap_jabatan: tunjanganTetap,
                    tunjangan_loyalitas: tunjanganLoyalitas,
                    bonus_lembur: totalBonusLembur,
                    bonus_kerajinan: kaliTepatWaktu * BONUS_KERAJINAN_HARIAN
                };

                const rincianPotongan = {
                    denda_keterlambatan: dendaTerlambat,
                    denda_alpha_void: dendaVoid
                };

                // Kalkulasi Total
                const totalSemuaBonus = Object.values(rincianBonus).reduce((acc, curr) => acc + (curr || 0), 0);
                const totalSemuaPotongan = Object.values(rincianPotongan).reduce((acc, curr) => acc + (curr || 0), 0);
                const gajiBersih = (gajiPokok + totalSemuaBonus) - totalSemuaPotongan;

                // 4. Simpan ke Tabel Penggajian
                const { error: errSave } = await supabase
                    .from('penggajian')
                    .insert([{ 
                        pegawai_id: pegawai.id, 
                        periode_bulan, 
                        periode_tahun, 
                        gaji_dasar: gajiPokok,
                        rincian_bonus: rincianBonus,
                        rincian_potongan: rincianPotongan,
                        total_bonus: totalSemuaBonus,
                        total_potongan: totalSemuaPotongan,
                        total_gaji: gajiBersih, 
                        status_pembayaran: 'Pending'
                    }]);

                // Jika error (misal karena constraint unique/sudah digenerate), lempar ke catch
                if (errSave) throw errSave;
                
                berhasil++;

            } catch (error) {
                // Jika 1 karyawan gagal (misal datanya sudah ada), abaikan dan lanjut ke karyawan berikutnya
                gagal++;
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: `Generate massal selesai. ${berhasil} Slip berhasil dibuat, ${gagal} gagal/dilewati (kemungkinan slip sudah ada).`
        });

    } catch (error) {
        console.error('Error Generate Massal:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat menghitung massal.' });
    }
};


module.exports = { getAllGaji, generateGaji, getRekapMingguan, getRekapHarian, generateGajiMassal };