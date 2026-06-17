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
        // 1. Terima parameter rentang tanggal dari Frontend
        const { tanggal_mulai, tanggal_selesai, periode_bulan, periode_tahun } = req.body;

        if (!tanggal_mulai || !tanggal_selesai || !periode_bulan || !periode_tahun) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parameter tanggal mulai, tanggal selesai, bulan, dan tahun wajib diisi!' 
            });
        }

        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, nama, tanggal_bergabung, jabatan_id, jabatan (*)');
            
        if (errPegawai) throw errPegawai;

        let berhasil = 0;
        let gagal = 0;

        for (const pegawai of listPegawai) {
            try {
                const aturanJabatan = pegawai.jabatan;
                if (!aturanJabatan) throw new Error(`Jabatan kosong`);

                // =======================================================
                // 🚀 FITUR BARU: CEK STATUS GAJI SEBELUM MENGHITUNG
                // =======================================================
                const { data: existingGaji } = await supabase
                    .from('penggajian')
                    .select('status_pembayaran')
                    .eq('pegawai_id', pegawai.id)
                    .eq('periode_bulan', periode_bulan)
                    .eq('periode_tahun', periode_tahun)
                    .maybeSingle();

                // Tolak proses jika slip gaji sudah dikunci / dibayar
                if (existingGaji && existingGaji.status_pembayaran === 'Lunas') {
                    throw new Error('Slip Gaji sudah berstatus LUNAS. Data dikunci.');
                }

                // ... Lanjutkan ke --- 1. HITUNG TABUNGAN LOYALITAS ---
                // --- 1. HITUNG TABUNGAN LOYALITAS (Tetap Dipertahankan) ---
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

                // --- 2. TARIK DATA ABSENSI BERDASARKAN RENTANG TANGGAL FLEKSIBEL ---
                const { data: dataAbsen, error: errAbsen } = await supabase
                    .from('absensi')
                    // Kita tidak butuh men-join tabel 'shifts' lagi karena semua sudah dihitung!
                    .select('status, upah_harian, bonus_kedisiplinan, bonus_kerapian, denda, upah_lembur') 
                    .eq('pegawai_id', pegawai.id)
                    .gte('tanggal', tanggal_mulai)
                    .lte('tanggal', tanggal_selesai);

                if (errAbsen) throw errAbsen;

                // Logika Tipe Penggajian Perusahaan
                const isBulanan = aturanJabatan.tipe_penggajian === 'Bulanan';
                let upahDasar = isBulanan ? (aturanJabatan.gaji_pokok_bulanan || 0) : 0;
                
                // Variabel Aggregator Dinamis
                let bonusDisiplinPeriodeIni = 0;
                let bonusKerapianPeriodeIni = 0;
                let uangLemburPeriodeIni = 0; 
                let dendaSistemPeriodeIni = 0; // Gabungan otomatis dari telat & pulang awal
                let dendaAlphaVoid = 0; 

                // Asumsi: Denda Alpha mengambil referensi dari upah harian jabatan
                const DENDA_ALPHA_PER_HARI = aturanJabatan.upah_per_kehadiran || 0; 

                if (dataAbsen && dataAbsen.length > 0) {
                    for (const absen of dataAbsen) {
                        if (absen.status === 'void' || absen.status === 'alfa') {
                            if (isBulanan) dendaAlphaVoid += DENDA_ALPHA_PER_HARI; 
                            // Catatan: Jika tipe harian, mereka otomatis tidak dapat upah harian, jadi tidak perlu didenda ganda
                        } else {
                            // Tambahkan upah harian HANYA jika sistem penggajiannya Harian
                            if (!isBulanan) {
                                upahDasar += (absen.upah_harian || 0);
                            }
                            
                            // Akumulasi data pre-calculated dari mesin ADMS
                            bonusDisiplinPeriodeIni += (absen.bonus_kedisiplinan || 0);
                            bonusKerapianPeriodeIni += (absen.bonus_kerapian || 0);
                            uangLemburPeriodeIni += (absen.upah_lembur || 0);
                            dendaSistemPeriodeIni += (absen.denda || 0);
                        }
                    }
                }

                // ... (Kode sebelumnya: Perhitungan dendaSistemPeriodeIni & dendaAlphaVoid) ...

                // =======================================================
                // [BARU] LOGIKA TARIK DAN POTONG KASBON
                // =======================================================
                const { data: daftarKasbonAktif } = await supabase
                    .from('kasbon')
                    .select('id, keterangan_pinjaman, nominal_cicilan_per_gajian, sisa_pinjaman')
                    .eq('pegawai_id', pegawai.id)
                    .eq('status', 'Disetujui')
                    .gt('sisa_pinjaman', 0);

                let totalPotonganKasbon = 0;
                let detailKasbonTerpotong = [];

                if (daftarKasbonAktif && daftarKasbonAktif.length > 0) {
                    for (const kasbon of daftarKasbonAktif) {
                        // Cerdas: Potong sesuai cicilan, JIKA sisa utangnya tinggal sedikit, potong sisanya saja.
                        const potonganRiil = Math.min(kasbon.nominal_cicilan_per_gajian, kasbon.sisa_pinjaman);
                        
                        totalPotonganKasbon += potonganRiil;
                        
                        // Simpan detail ini ke dalam JSONB untuk ditampilkan di cetak Slip Gaji
                        detailKasbonTerpotong.push({
                            kasbon_id: kasbon.id,
                            keterangan: kasbon.keterangan_pinjaman,
                            nominal_potongan: potonganRiil
                        });
                    }
                }

                // --- 3. RAKIT KOMPONEN JSON ---
                const rincianBonus = {
                    bonus_kedisiplinan_harian: bonusDisiplinPeriodeIni,
                    uang_lembur_akumulasi: Math.round(uangLemburPeriodeIni)
                };

                const rincianPotongan = {
                    denda_sistem_absensi: dendaSistemPeriodeIni,
                    denda_alpha_void: dendaAlphaVoid,
                    potongan_kasbon: totalPotonganKasbon, // Masukkan ke rincian
                    detail_kasbon: detailKasbonTerpotong  // Metadata kasbon
                };

                const totalBonusCair = Object.values(rincianBonus).reduce((a, b) => a + (b || 0), 0);
                // Hitung total potongan murni (tanpa objek detail_kasbon)
                const totalPotonganCair = dendaSistemPeriodeIni + dendaAlphaVoid + totalPotonganKasbon;
                
                let gajiBersih = (upahDasar + totalBonusCair) - totalPotonganCair;

                // PROTEKSI GAJI MINUS KARENA KASBON TERLALU BESAR
                if (gajiBersih < 0) {
                    // Jika gaji minus, kita batalkan potongan kasbon sebagian atau sesuaikan 
                    // agar gaji 0 (Atau biarkan 0 jika memang utangnya lebih besar dari gaji)
                    gajiBersih = 0; 
                }

                // --- 4. SIMPAN KE TABEL PENGGAJIAN ---
                const { error: errSaveGaji } = await supabase
                    .from('penggajian')
                    .upsert([{ 
                        pegawai_id: pegawai.id, 
                        periode_bulan, 
                        periode_tahun, 
                        
                        // BUKA KOMENTAR DAN TAMBAHKAN DUA BARIS INI:
                        tanggal_awal_periode: tanggal_mulai, 
                        tanggal_akhir_periode: tanggal_selesai,
                        
                        gaji_dasar: upahDasar,
                        rincian_bonus: rincianBonus,
                        rincian_potongan: rincianPotongan,
                        informasi_tabungan: infoTabungan, 
                        total_bonus: totalBonusCair,
                        total_potongan: totalPotonganCair,
                        total_gaji: gajiBersih, 
                        status_pembayaran: 'Pending'
                    }], {
                        // Pastikan onConflict sesuai dengan unique constraint Anda di DB
                        onConflict: 'pegawai_id,periode_bulan,periode_tahun' 
                    });

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



module.exports = { getAllGaji, getRekapMingguan, getRekapHarian, generateGajiMassal };