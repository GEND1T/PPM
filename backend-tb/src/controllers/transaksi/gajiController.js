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

const konversiKeMenit = (timeStr) => {
    if (!timeStr || timeStr === '-') return 0;
    const [jam, menit] = timeStr.split(':').map(Number);
    return (jam * 60) + menit;
};

const hitungMenitTerlambat = (waktuScanMasuk, jamMasukShift) => {
    const scan = konversiKeMenit(waktuScanMasuk);
    const target = konversiKeMenit(jamMasukShift);
    return scan > target ? scan - target : 0;
};

const hitungMenitPulangAwal = (waktuScanPulang, jamPulangShift) => {
    const scan = konversiKeMenit(waktuScanPulang);
    const target = konversiKeMenit(jamPulangShift);
    return scan < target ? target - scan : 0;
};

const generateGajiMassal = async (req, res) => {
    try {
        const { periode_bulan, periode_tahun } = req.body;

        if (!periode_bulan || !periode_tahun) {
            return res.status(400).json({ success: false, message: 'Data periode bulan dan tahun wajib diisi!' });
        }

        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, nama, tanggal_bergabung, jabatan_id, jabatan (*)');
            
        if (errPegawai) throw errPegawai;

        const bulanStr = String(periode_bulan).padStart(2, '0');
        const awalBulan = `${periode_tahun}-${bulanStr}-01`;
        const totalHariBulan = new Date(periode_tahun, periode_bulan, 0).getDate();
        const akhirBulan = `${periode_tahun}-${bulanStr}-${String(totalHariBulan).padStart(2, '0')}`;

        let berhasil = 0;
        let gagal = 0;

        for (const pegawai of listPegawai) {
            try {
                const aturanJabatan = pegawai.jabatan;
                if (!aturanJabatan) throw new Error(`Jabatan kosong`);

                // --- 1. HITUNG TABUNGAN LOYALITAS ---
                // (Cron tidak mengurus ini karena berbasis tanggal bergabung, jadi Backend Gaji yang menghitungnya)
                let tabunganLoyalitas = 0;
                if (pegawai.tanggal_bergabung) {
                    const tglBergabung = new Date(pegawai.tanggal_bergabung);
                    const hariIni = new Date();
                    let masaKerjaTahun = hariIni.getFullYear() - tglBergabung.getFullYear();
                    
                    const m = hariIni.getMonth() - tglBergabung.getMonth();
                    if (m < 0 || (m === 0 && hariIni.getDate() < tglBergabung.getDate())) masaKerjaTahun--;

                    if (masaKerjaTahun > 0) {
                        const { data: tierMasaKerja } = await supabase
                            .from('tier_tunjangan_masa_kerja')
                            .select('nominal_pengali')
                            .eq('jabatan_id', pegawai.jabatan_id)
                            .lte('minimal_tahun', masaKerjaTahun)
                            .order('minimal_tahun', { ascending: false })
                            .limit(1);

                        if (tierMasaKerja && tierMasaKerja.length > 0) {
                            tabunganLoyalitas = masaKerjaTahun * (tierMasaKerja[0].nominal_pengali || 0);
                        }
                    }
                }

                // --- 2. TARIK DATA ABSENSI BULANAN UNTUK THP ---
                const { data: dataAbsen, error: errAbsen } = await supabase
                    .from('absensi')
                    .select('*, shifts (*)')
                    .eq('pegawai_id', pegawai.id)
                    .gte('tanggal', awalBulan)
                    .lte('tanggal', akhirBulan);

                if (errAbsen) throw errAbsen;

                let upahDasar = aturanJabatan.tipe_penggajian === 'Bulanan' ? (aturanJabatan.gaji_pokok_bulanan || 0) : 0;
                let bonusDisiplinBulanIni = 0;
                let bonusKerapianBulanIni = 0;
                let uangLemburBulanIni = 0; 
                
                let dendaKeterlambatan = 0;
                let dendaPulangAwal = 0;
                let dendaAlphaVoid = 0; 

                if (dataAbsen && dataAbsen.length > 0) {
                    for (const absen of dataAbsen) {
                        const ruleShift = absen.shifts;
                        const isBulanan = aturanJabatan.tipe_penggajian === 'Bulanan';

                        if (absen.status === 'void') {
                            if (isBulanan) dendaAlphaVoid += (aturanJabatan.upah_per_kehadiran || 0);
                            continue; 
                        }

                        if (!isBulanan) upahDasar += (absen.upah_harian || aturanJabatan.upah_per_kehadiran || 0);

                        if (absen.menit_lembur_diakui && absen.menit_lembur_diakui > 0) {
                            const jamLembur = absen.menit_lembur_diakui / 60;
                            uangLemburBulanIni += (jamLembur * (aturanJabatan.upah_lembur_per_jam || 0));
                        }

                        if (ruleShift) {
                            if (ruleShift.is_potong_gaji_terlambat && absen.waktu_awal) {
                                const mTelat = hitungMenitTerlambat(absen.waktu_awal, ruleShift.jam_masuk);
                                if (mTelat > (ruleShift.batas_toleransi_menit || 0)) dendaKeterlambatan += (mTelat * (ruleShift.denda_terlambat_per_menit || 0));
                            }
                            if (ruleShift.is_potong_gaji_pulang_awal && absen.waktu_akhir) {
                                const mAwal = hitungMenitPulangAwal(absen.waktu_akhir, ruleShift.jam_pulang);
                                if (mAwal > (ruleShift.toleransi_pulang_awal_menit || 0)) dendaPulangAwal += (mAwal * (ruleShift.denda_pulang_awal_per_menit || 0));
                            }
                        }

                        if (absen.status === 'intime' || absen.status === 'ontime') bonusDisiplinBulanIni += (aturanJabatan.bonus_disiplin_harian || 0);
                        if (absen.is_kerapian) bonusKerapianBulanIni += (aturanJabatan.bonus_kerapian_harian || 0);
                    }
                }

                const rincianBonus = {
                    bonus_kedisiplinan_harian: bonusDisiplinBulanIni,
                    bonus_kerapian_harian: bonusKerapianBulanIni,
                    uang_lembur_bulanan: Math.round(uangLemburBulanIni)
                };

                const rincianPotongan = {
                    denda_keterlambatan_menit: dendaKeterlambatan,
                    denda_pulang_awal_menit: dendaPulangAwal,
                    denda_alpha_void: dendaAlphaVoid
                };

                // --- 3. AMBIL INFO TABUNGAN DARI CRON JOB UNTUK DI TAMPILKAN DI SLIP ---
                const { data: recordTHR } = await supabase
                    .from('rekap_tahunan_hari_raya')
                    .select('total_bonus_mingguan_terkumpul, nominal_bonus_lembur_tahunan')
                    .eq('pegawai_id', pegawai.id)
                    .eq('periode_tahun', periode_tahun)
                    .maybeSingle();

                const infoTabungan = {
                    tabungan_loyalitas_akumulasi: tabunganLoyalitas,
                    tabungan_mingguan_terkumpul: recordTHR?.total_bonus_mingguan_terkumpul || 0,
                    tabungan_lembur_tahunan_terkumpul: recordTHR?.nominal_bonus_lembur_tahunan || 0
                };

                const totalBonusCair = Object.values(rincianBonus).reduce((a, b) => a + (b || 0), 0);
                const totalPotonganCair = Object.values(rincianPotongan).reduce((a, b) => a + (b || 0), 0);
                let gajiBersih = (upahDasar + totalBonusCair) - totalPotonganCair;
                if (gajiBersih < 0) gajiBersih = 0; 

                // --- 4. SIMPAN KE TABEL PENGGAJIAN ---
                const { error: errSaveGaji } = await supabase
                    .from('penggajian')
                    .insert([{ 
                        pegawai_id: pegawai.id, 
                        periode_bulan, 
                        periode_tahun, 
                        gaji_dasar: upahDasar,
                        rincian_bonus: rincianBonus,
                        rincian_potongan: rincianPotongan,
                        informasi_tabungan: infoTabungan, 
                        total_bonus: totalBonusCair,
                        total_potongan: totalPotonganCair,
                        total_gaji: gajiBersih, 
                        status_pembayaran: 'Pending'
                    }]);

                if (errSaveGaji) throw errSaveGaji;

                // --- 5. UPDATE HANYA SALDO LOYALITAS KE TABEL THR ---
                if (recordTHR) {
                    await supabase
                        .from('rekap_tahunan_hari_raya')
                        .update({ saldo_loyalitas: tabunganLoyalitas })
                        .eq('pegawai_id', pegawai.id)
                        .eq('periode_tahun', periode_tahun);
                } else {
                    await supabase
                        .from('rekap_tahunan_hari_raya')
                        .insert([{
                            pegawai_id: pegawai.id,
                            periode_tahun: periode_tahun,
                            saldo_loyalitas: tabunganLoyalitas
                        }]);
                }

                berhasil++;

            } catch (error) {
                console.error(`Gagal memproses pegawai ID ${pegawai.id}:`, error.message);
                gagal++;
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: `Selesai. ${berhasil} Slip Gaji diproses, ${gagal} dilewati.`
        });

    } catch (error) {
        console.error('Critical Error:', error);
        return res.status(500).json({ success: false, message: 'Kegagalan sistem pada payroll engine.' });
    }
};

module.exports = { getAllGaji, generateGaji, getRekapMingguan, getRekapHarian, generateGajiMassal };