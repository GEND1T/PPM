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
                pegawai!inner (nama, jabatan (nama_jabatan, departemen (nama_departemen)))
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
                pegawai!inner (nama, jabatan (nama_jabatan, departemen (nama_departemen)))
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
                pegawai (nama, jabatan (nama_jabatan, departemen (nama_departemen)))
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

// const hitungMenitTerlambat = (waktuScanMasuk, jamMasukShift) => {
//     const scan = konversiKeMenit(waktuScanMasuk);
//     const target = konversiKeMenit(jamMasukShift);
//     return scan > target ? scan - target : 0;
// };

// const hitungMenitPulangAwal = (waktuScanPulang, jamPulangShift) => {
//     const scan = konversiKeMenit(waktuScanPulang);
//     const target = konversiKeMenit(jamPulangShift);
//     return scan < target ? target - scan : 0;
// };
// Helper untuk mengubah "2026-05-05" menjadi "Senin", "Selasa", dll.

const generateGajiMassal = async (req, res) => {
    try {
        const { tanggal_mulai, tanggal_selesai, periode_bulan, periode_tahun } = req.body;

        if (!tanggal_mulai || !tanggal_selesai || !periode_bulan || !periode_tahun) {
            return res.status(400).json({ success: false, message: 'Parameter tanggal mulai, tanggal selesai, bulan, dan tahun wajib diisi!' });
        }

        // 1. Ambil Seluruh Data Pegawai
        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, nama, tanggal_bergabung, jabatan_id, jabatan (*)');
            
        if (errPegawai) throw errPegawai;
        if (!listPegawai || listPegawai.length === 0) {
            return res.status(200).json({ success: true, message: 'Selesai. 0 Slip Gaji diproses, 0 dilewati.' });
        }

        const pegawaiIds = listPegawai.map(p => p.id);

        // 2. BULK FETCHING: Ambil semua data pendukung secara paralel di awal
        const [
            { data: allExistingGaji, error: errExisting },
            { data: allTargetData, error: errTarget },
            { data: allAbsenData, error: errAbsen },
            { data: allKasbonData, error: errKasbon },
            { data: allBonusCustomData, error: errBonusCustom },
            { data: allPotonganCustomData, error: errPotonganCustom },
            { data: allTierMasaKerja, error: errTier },
            { data: allRecordTHR, error: errTHR }
        ] = await Promise.all([
            // 2.1 Cek status penggajian yang sudah ada untuk periode ini
            (() => {
                let q = supabase
                    .from('penggajian')
                    .select('pegawai_id, status_pembayaran, tanggal_awal_periode, tanggal_akhir_periode')
                    .in('pegawai_id', pegawaiIds);
                if (tanggal_mulai && tanggal_selesai) {
                    return q.gte('tanggal_awal_periode', tanggal_mulai).lte('tanggal_akhir_periode', tanggal_selesai);
                }
                return q.eq('periode_bulan', periode_bulan).eq('periode_tahun', periode_tahun);
            })(),

            // 2.2 Data Target Harian
            supabase
                .from('pencapaian_target_harian')
                .select('pegawai_id, tanggal, jumlah_pencapaian, nominal_total_riil, master_target(nama_target, harga_satuan)')
                .in('pegawai_id', pegawaiIds)
                .gte('tanggal', tanggal_mulai)
                .lte('tanggal', tanggal_selesai)
                .order('tanggal', { ascending: true }),

            // 2.3 Data Absensi
            supabase
                .from('absensi')
                .select('pegawai_id, tanggal, status, upah_harian, bonus_kedisiplinan, bonus_kerapian, denda, upah_lembur')
                .in('pegawai_id', pegawaiIds)
                .gte('tanggal', tanggal_mulai)
                .lte('tanggal', tanggal_selesai)
                .order('tanggal', { ascending: true }),

            // 2.4 Data Kasbon Aktif
            supabase
                .from('kasbon')
                .select('id, pegawai_id, keterangan_pinjaman, nominal_cicilan_per_gajian, sisa_pinjaman')
                .in('pegawai_id', pegawaiIds)
                .eq('status', 'Disetujui')
                .gt('sisa_pinjaman', 0),

            // 2.5 Data Bonus Custom
            supabase
                .from('bonus_custom_pegawai')
                .select('id, pegawai_id, tanggal_diberikan, keterangan, nominal')
                .in('pegawai_id', pegawaiIds)
                .gte('tanggal_diberikan', tanggal_mulai)
                .lte('tanggal_diberikan', tanggal_selesai),

            // 2.5b Data Potongan Custom
            supabase
                .from('potongan_custom_pegawai')
                .select('id, pegawai_id, tanggal_diberikan, keterangan, nominal')
                .in('pegawai_id', pegawaiIds)
                .gte('tanggal_diberikan', tanggal_mulai)
                .lte('tanggal_diberikan', tanggal_selesai),

            // 2.6 Data Tier Masa Kerja (diurutkan minimal_tahun descending)
            supabase
                .from('tier_tunjangan_masa_kerja')
                .select('jabatan_id, minimal_tahun, nominal_pengali')
                .order('minimal_tahun', { ascending: false }),

            // 2.7 Data Rekap THR
            supabase
                .from('rekap_tahunan_hari_raya')
                .select('pegawai_id, total_bonus_mingguan_terkumpul, nominal_bonus_lembur_tahunan')
                .eq('periode_tahun', periode_tahun)
                .in('pegawai_id', pegawaiIds)
        ]);

        if (errExisting) throw errExisting;
        if (errTarget) throw errTarget;
        if (errAbsen) throw errAbsen;
        if (errKasbon) throw errKasbon;
        if (errBonusCustom) throw errBonusCustom;
        if (errPotonganCustom) throw errPotonganCustom;
        if (errTier) throw errTier;
        if (errTHR) throw errTHR;

        // 3. INDEXING DATA DI MEMORI (Map/Dictionary Indexing)
        const groupByPegawai = (arr) => (arr || []).reduce((acc, item) => {
            (acc[item.pegawai_id] = acc[item.pegawai_id] || []).push(item);
            return acc;
        }, {});

        const existingGajiMap = (allExistingGaji || []).reduce((acc, item) => {
            acc[item.pegawai_id] = item;
            return acc;
        }, {});

        const targetMap = groupByPegawai(allTargetData);
        const absenMap = groupByPegawai(allAbsenData);
        const kasbonMap = groupByPegawai(allKasbonData);
        const bonusCustomMap = groupByPegawai(allBonusCustomData);
        const potonganCustomMap = groupByPegawai(allPotonganCustomData);
        const thrMap = (allRecordTHR || []).reduce((acc, item) => {
            acc[item.pegawai_id] = item;
            return acc;
        }, {});

        // Helper format Tanggal
        const getNamaHari = (tgl) => {
            if (!tgl) return "-";
            const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            return hari[new Date(tgl).getDay()];
        };

        let berhasil = 0;
        let gagal = 0;

        const payloadPenggajian = [];
        const payloadTHR = [];

        // 4. KALKULASI DI MEMORI (Tanpa Network I/O di dalam Loop)
        for (const pegawai of listPegawai) {
            try {
                const aturanJabatan = pegawai.jabatan;
                if (!aturanJabatan) throw new Error('Jabatan kosong');

                // A. CEK STATUS GAJI: Jika sudah LUNAS, KUNCI & DILEWATI
                const existingGaji = existingGajiMap[pegawai.id];
                if (existingGaji && existingGaji.status_pembayaran === 'Lunas') {
                    throw new Error('Slip Gaji sudah LUNAS. Data dikunci.');
                }

                const tipeGaji = aturanJabatan.tipe_penggajian;
                const isBulanan = tipeGaji === 'Bulanan';
                const isHarian = tipeGaji === 'Harian';
                const isTarget = tipeGaji === 'Target';
                let upahDasar = isBulanan ? (aturanJabatan.gaji_pokok_bulanan || 0) : 0;

                // B. DATA TARGET (Tipe Target)
                const targetData = targetMap[pegawai.id] || [];
                if (isTarget) {
                    upahDasar = targetData.reduce((sum, item) => sum + Number(item.nominal_total_riil || 0), 0);
                }

                // C. DATA ABSENSI
                const dataAbsen = absenMap[pegawai.id] || [];
                const absenAda = dataAbsen.length > 0;
                const targetAda = targetData.length > 0;

                // SKIP PEGAWAI TANPA AKTIVITAS
                if (!absenAda && !targetAda) {
                    throw new Error('Tidak ada data kehadiran/target (Dilewati).');
                }

                // H. BONUS & POTONGAN CUSTOM MAP FOR PEGAWAI
                const daftarBonusCustom = bonusCustomMap[pegawai.id] || [];
                const daftarPotonganCustom = potonganCustomMap[pegawai.id] || [];

                const processedBonusDates = new Set();
                const processedPotonganDates = new Set();

                // VARIABEL AGGREGATOR
                let bonusDisiplinPeriodeIni = 0;
                let bonusKerapianPeriodeIni = 0;
                let uangLemburPeriodeIni = 0;
                let dendaSistemPeriodeIni = 0;
                let dendaAlphaVoid = 0;
                let totalHariHadir = 0;
                const DENDA_ALPHA_PER_HARI = aturanJabatan.upah_per_kehadiran || 0;

                let arrayDetailHarian = [];
                const mapAbsenIndividual = {};

                // D. LOGIKA ABSENSI
                if (absenAda) {
                    for (const absen of dataAbsen) {
                        mapAbsenIndividual[absen.tanggal] = absen;

                        if (absen.status === 'void' || absen.status === 'alfa') {
                            if (isBulanan) dendaAlphaVoid += DENDA_ALPHA_PER_HARI;
                        } else {
                            totalHariHadir++;
                            if (isHarian) upahDasar += (absen.upah_harian || 0);

                            bonusDisiplinPeriodeIni += (absen.bonus_kedisiplinan || 0);
                            bonusKerapianPeriodeIni += (absen.bonus_kerapian || 0);
                            uangLemburPeriodeIni += (absen.upah_lembur || 0);
                            dendaSistemPeriodeIni += (absen.denda || 0);

                            let bCustomHariIni = 0;
                            if (!processedBonusDates.has(absen.tanggal)) {
                                bCustomHariIni = daftarBonusCustom
                                    .filter(b => b.tanggal_diberikan === absen.tanggal)
                                    .reduce((sum, b) => sum + Number(b.nominal || 0), 0);
                                if (bCustomHariIni > 0) processedBonusDates.add(absen.tanggal);
                            }

                            let pCustomHariIni = 0;
                            if (!processedPotonganDates.has(absen.tanggal)) {
                                pCustomHariIni = daftarPotonganCustom
                                    .filter(p => p.tanggal_diberikan === absen.tanggal)
                                    .reduce((sum, p) => sum + Number(p.nominal || 0), 0);
                                if (pCustomHariIni > 0) processedPotonganDates.add(absen.tanggal);
                            }

                            if (isHarian) {
                                const totalHarian = (absen.upah_harian || 0) + (absen.bonus_kedisiplinan || 0) + (absen.bonus_kerapian || 0) + (absen.upah_lembur || 0) + bCustomHariIni - pCustomHariIni;
                                arrayDetailHarian.push({
                                    hari_tanggal: getNamaHari(absen.tanggal),
                                    tanggal: absen.tanggal,
                                    gaji_kehadiran: absen.upah_harian || 0,
                                    t_absensi: absen.bonus_kedisiplinan || 0,
                                    t_kerapian: absen.bonus_kerapian || 0,
                                    sortir: 0,
                                    lembur: absen.upah_lembur || 0,
                                    bonus_custom: bCustomHariIni,
                                    potongan_custom: pCustomHariIni,
                                    total_harian: totalHarian
                                });
                            }
                        }
                    }
                }

                // E. DETAIL HARIAN TIPE TARGET
                if (isTarget && targetAda) {
                    for (const target of targetData) {
                        const tgl = target.tanggal;
                        const absenHariIni = mapAbsenIndividual[tgl] || {};

                        const nominalRiil = Number(target.nominal_total_riil || 0);
                        const tAbs = absenHariIni.bonus_kedisiplinan || 0;
                        const tKrp = absenHariIni.bonus_kerapian || 0;
                        const lembur = absenHariIni.upah_lembur || 0;

                        let bCustomHariIni = 0;
                        if (!processedBonusDates.has(tgl)) {
                            bCustomHariIni = daftarBonusCustom
                                .filter(b => b.tanggal_diberikan === tgl)
                                .reduce((sum, b) => sum + Number(b.nominal || 0), 0);
                            if (bCustomHariIni > 0) processedBonusDates.add(tgl);
                        }

                        let pCustomHariIni = 0;
                        if (!processedPotonganDates.has(tgl)) {
                            pCustomHariIni = daftarPotonganCustom
                                .filter(p => p.tanggal_diberikan === tgl)
                                .reduce((sum, p) => sum + Number(p.nominal || 0), 0);
                            if (pCustomHariIni > 0) processedPotonganDates.add(tgl);
                        }

                        arrayDetailHarian.push({
                            hari_tanggal: getNamaHari(tgl),
                            tanggal: tgl,
                            nama_target: target.master_target?.nama_target || '-',
                            harga_satuan: target.master_target?.harga_satuan || 0,
                            capaian: target.jumlah_pencapaian || 0,
                            t_absensi: tAbs,
                            t_kerapian: tKrp,
                            lembur: lembur,
                            sortir: 0,
                            bonus_custom: bCustomHariIni,
                            potongan_custom: pCustomHariIni,
                            total_harian: nominalRiil + tAbs + tKrp + lembur + bCustomHariIni - pCustomHariIni
                        });
                    }
                }

                // F. BONUS MINGGUAN
                let bonusKehadiranMingguan = 0;
                if (totalHariHadir === 4) bonusKehadiranMingguan = aturanJabatan.bonus_minggu_4_hari || 0;
                else if (totalHariHadir === 5) bonusKehadiranMingguan = aturanJabatan.bonus_minggu_5_hari || 0;
                else if (totalHariHadir >= 6) bonusKehadiranMingguan = aturanJabatan.bonus_minggu_6_hari || 0;

                // H. BONUS CUSTOM
                let totalBonusCustom = 0;
                let detailBonusCustom = [];

                if (daftarBonusCustom.length > 0) {
                    for (const bonus of daftarBonusCustom) {
                        totalBonusCustom += Number(bonus.nominal);
                        detailBonusCustom.push({
                            id: bonus.id,
                            tanggal: bonus.tanggal_diberikan,
                            hari_tanggal: getNamaHari(bonus.tanggal_diberikan),
                            keterangan: bonus.keterangan,
                            nominal: Number(bonus.nominal)
                        });
                    }
                }

                // I. RAKIT KOMPONEN BONUS
                const rincianBonus = {
                    bonus_kedisiplinan_harian: bonusDisiplinPeriodeIni,
                    bonus_kerapian_harian: bonusKerapianPeriodeIni,
                    uang_lembur_akumulasi: Math.round(uangLemburPeriodeIni),
                    bonus_kehadiran_mingguan: bonusKehadiranMingguan,
                    total_bonus_custom: totalBonusCustom,
                    detail_bonus_custom: detailBonusCustom
                };

                const totalBonusCair = Object.values(rincianBonus).reduce((a, b) => {
                    return typeof b === 'number' ? a + b : a;
                }, 0);

                // J. HIRARKI POTONGAN (Deduction Priority Cascade)
                // Prioritas 1: Denda Sistem & Absensi dipotong lebih dulu
                const dendaTotal = dendaSistemPeriodeIni + dendaAlphaVoid;
                const gajiKotor = upahDasar + totalBonusCair;
                let sisaKapasitasGaji = Math.max(0, gajiKotor - dendaTotal);

                // Prioritas 2: Kasbon dipotong sebatas sisa kapasitas gaji (mencegah THP minus)
                const daftarKasbonAktif = kasbonMap[pegawai.id] || [];
                let totalPotonganKasbon = 0;
                let detailKasbonTerpotong = [];

                if (daftarKasbonAktif.length > 0 && sisaKapasitasGaji > 0) {
                    for (const kasbon of daftarKasbonAktif) {
                        const cicilanRencana = Math.min(kasbon.nominal_cicilan_per_gajian, kasbon.sisa_pinjaman);
                        const potonganRiil = Math.min(cicilanRencana, sisaKapasitasGaji);

                        if (potonganRiil > 0) {
                            totalPotonganKasbon += potonganRiil;
                            sisaKapasitasGaji -= potonganRiil;

                            detailKasbonTerpotong.push({
                                kasbon_id: kasbon.id,
                                keterangan: kasbon.keterangan_pinjaman,
                                nominal_potongan: potonganRiil,
                                sisa_pinjaman_terkini: kasbon.sisa_pinjaman - potonganRiil
                            });
                        }
                    }
                }

                // Prioritas 3: Potongan Custom
                let totalPotonganCustom = 0;
                let detailPotonganCustom = [];

                if (daftarPotonganCustom.length > 0) {
                    for (const potongan of daftarPotonganCustom) {
                        totalPotonganCustom += Number(potongan.nominal);
                        detailPotonganCustom.push({
                            id: potongan.id,
                            tanggal: potongan.tanggal_diberikan,
                            hari_tanggal: getNamaHari(potongan.tanggal_diberikan),
                            keterangan: potongan.keterangan,
                            nominal: Number(potongan.nominal)
                        });
                    }
                }

                const rincianPotongan = {
                    denda_sistem_absensi: dendaSistemPeriodeIni,
                    denda_alpha_void: dendaAlphaVoid,
                    potongan_kasbon: totalPotonganKasbon,
                    detail_kasbon: detailKasbonTerpotong,
                    total_potongan_custom: totalPotonganCustom,
                    detail_potongan_custom: detailPotonganCustom
                };

                const totalPotonganCair = dendaTotal + totalPotonganKasbon + totalPotonganCustom;
                let gajiBersih = Math.max(0, gajiKotor - totalPotonganCair);

                // K. TABUNGAN LOYALITAS & THR
                let tabunganLoyalitas = 0;
                if (pegawai.tanggal_bergabung) {
                    const tglBergabung = new Date(pegawai.tanggal_bergabung);
                    const hariIni = new Date();
                    let masaKerjaTahun = hariIni.getFullYear() - tglBergabung.getFullYear();
                    const m = hariIni.getMonth() - tglBergabung.getMonth();
                    if (m < 0 || (m === 0 && hariIni.getDate() < tglBergabung.getDate())) masaKerjaTahun--;

                    if (masaKerjaTahun > 0) {
                        const matchingTier = (allTierMasaKerja || []).find(t => 
                            t.jabatan_id === pegawai.jabatan_id && masaKerjaTahun >= t.minimal_tahun
                        );
                        if (matchingTier) {
                            tabunganLoyalitas = masaKerjaTahun * (matchingTier.nominal_pengali || 0);
                        }
                    }
                }

                const recordTHR = thrMap[pegawai.id];
                const infoTabungan = {
                    tabungan_loyalitas_akumulasi: tabunganLoyalitas,
                    tabungan_mingguan_terkumpul: recordTHR?.total_bonus_mingguan_terkumpul || 0,
                    tabungan_lembur_tahunan_terkumpul: recordTHR?.nominal_bonus_lembur_tahunan || 0
                };

                // L. KUMPULKAN KE PAYLOAD BATCH
                payloadPenggajian.push({
                    pegawai_id: pegawai.id,
                    periode_bulan,
                    periode_tahun,
                    tanggal_awal_periode: tanggal_mulai,
                    tanggal_akhir_periode: tanggal_selesai,
                    gaji_dasar: upahDasar,
                    detail_harian: arrayDetailHarian,
                    rincian_bonus: rincianBonus,
                    rincian_potongan: rincianPotongan,
                    informasi_tabungan: infoTabungan,
                    total_bonus: totalBonusCair,
                    total_potongan: totalPotonganCair,
                    total_gaji: gajiBersih,
                    status_pembayaran: 'Pending'
                });

                payloadTHR.push({
                    pegawai_id: pegawai.id,
                    periode_tahun: periode_tahun,
                    saldo_loyalitas: tabunganLoyalitas
                });

                berhasil++;

            } catch (error) {
                // Dilewati (Lunas / Kosong / Error Jabatan)
                gagal++;
            }
        }

        // 5. BULK UPSERT KE DATABASE
        if (payloadPenggajian.length > 0) {
            const { error: errSaveGaji } = await supabase
                .from('penggajian')
                .upsert(payloadPenggajian, { onConflict: 'pegawai_id,periode_bulan,periode_tahun' });

            if (errSaveGaji) throw errSaveGaji;
        }

        if (payloadTHR.length > 0) {
            const { error: errSaveTHR } = await supabase
                .from('rekap_tahunan_hari_raya')
                .upsert(payloadTHR, { onConflict: 'pegawai_id,periode_tahun' });

            if (errSaveTHR) throw errSaveTHR;
        }

        return res.status(200).json({ success: true, message: `Selesai. ${berhasil} Slip Gaji diproses, ${gagal} dilewati.` });

    } catch (error) {
        console.error('Error generateGajiMassal:', error.message);
        return res.status(500).json({ success: false, message: 'Kegagalan sistem pada payroll engine.' });
    }
};




// PATCH: Menandai slip gaji sebagai LUNAS dan mengeksekusi pemotongan kasbon
const pelunasanGaji = async (req, res) => {
    try {
        const { id } = req.params; // ID dari tabel penggajian

        // 1. Ambil data slip gaji yang akan dilunasi
        const { data: slipGaji, error: errSlip } = await supabase
            .from('penggajian')
            .select(`
                id, pegawai_id, periode_bulan, periode_tahun, 
                gaji_dasar, total_bonus, total_potongan, total_gaji, 
                status_pembayaran, rincian_potongan,
                pegawai (nama)
            `)
            .eq('id', id)
            .single();

        if (errSlip || !slipGaji) {
            return res.status(404).json({ 
                success: false, 
                message: 'Data slip gaji tidak ditemukan.' 
            });
        }

        // 2. Proteksi Double-Execution
        if (slipGaji.status_pembayaran === 'Lunas') {
            return res.status(400).json({ 
                success: false, 
                message: `Slip gaji atas nama ${slipGaji.pegawai?.nama || 'Pegawai'} sudah berstatus LUNAS sebelumnya.` 
            });
        }

        // 3. EKSEKUSI PENGURANGAN UTANG KASBON (Dengan Proteksi Maksimal Kapasitas Gaji)
        const detailKasbon = slipGaji.rincian_potongan?.detail_kasbon || [];
        const ringkasanUpdateKasbon = [];

        // Proteksi Ganda: Kapasitas sisa gaji kotor dikurangi total denda absensi
        const gajiKotor = (Number(slipGaji.gaji_dasar) || 0) + (Number(slipGaji.total_bonus) || 0);
        const dendaAbsensi = (Number(slipGaji.rincian_potongan?.denda_sistem_absensi) || 0) + (Number(slipGaji.rincian_potongan?.denda_alpha_void) || 0);
        let kapasitasGajiPelunasan = Math.max(0, gajiKotor - dendaAbsensi);

        if (detailKasbon.length > 0 && kapasitasGajiPelunasan > 0) {
            for (const item of detailKasbon) {
                // Tarik sisa pinjaman terbaru dari DB untuk menghindari Race Condition
                const { data: kasbonAsli } = await supabase
                    .from('kasbon')
                    .select('sisa_pinjaman, status')
                    .eq('id', item.kasbon_id)
                    .single();

                if (kasbonAsli) {
                    // Potong sisa pinjaman sebatas KAPASITAS GAJI YANG TERSEDIA (mencegah pemotongan fiktif)
                    const nominalRencana = Number(item.nominal_potongan || 0);
                    const nominalDipotong = Math.min(nominalRencana, kapasitasGajiPelunasan);
                    kapasitasGajiPelunasan -= nominalDipotong;

                    if (nominalDipotong > 0) {
                        const sisaBaru = Math.max(0, kasbonAsli.sisa_pinjaman - nominalDipotong);
                        const statusBaru = sisaBaru <= 0 ? 'Lunas' : 'Disetujui';

                        // Update tabel kasbon
                        const { error: errUpdateKasbon } = await supabase
                            .from('kasbon')
                            .update({ 
                                sisa_pinjaman: sisaBaru, 
                                status: statusBaru
                            })
                            .eq('id', item.kasbon_id);

                        if (errUpdateKasbon) {
                            console.error(`[ERROR KASBON] Gagal update Kasbon ID ${item.kasbon_id}:`, errUpdateKasbon.message);
                        } else {
                            // Catat ke riwayat_pembayaran_kasbon
                            const todayStr = new Date().toLocaleDateString('en-CA');
                            await supabase
                                .from('riwayat_pembayaran_kasbon')
                                .insert([{
                                    kasbon_id: item.kasbon_id,
                                    tanggal_pembayaran: todayStr,
                                    nominal_bayar: nominalDipotong,
                                    metode_pembayaran: 'Potong Gaji',
                                    keterangan: `Potongan Otomatis Penggajian Periode ${slipGaji.periode_bulan}/${slipGaji.periode_tahun}`
                                }]);

                            ringkasanUpdateKasbon.push({
                                kasbon_id: item.kasbon_id,
                                keterangan: item.keterangan,
                                dipotong: nominalDipotong,
                                sisa_pinjaman_terkini: sisaBaru,
                                status_kasbon: statusBaru
                            });
                        }
                    }
                }
            }
        }

        // 4. UBAH STATUS SLIP GAJI MENJADI LUNAS
        const { error: errUpdateGaji } = await supabase
            .from('penggajian')
            .update({ status_pembayaran: 'Lunas' })
            .eq('id', id);

        if (errUpdateGaji) throw errUpdateGaji;

        // 5. RESPONSE RESMI KE FRONTEND
        return res.status(200).json({
            success: true,
            message: `Slip gaji untuk ${slipGaji.pegawai?.nama || 'Pegawai'} berhasil dilunasi.`,
            data: {
                penggajian_id: slipGaji.id,
                total_thp_dibayarkan: slipGaji.total_gaji,
                status_pembayaran: 'Lunas',
                pemotongan_kasbon: ringkasanUpdateKasbon
            }
        });

    } catch (error) {
        console.error('Error pelunasanGaji:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan sistem saat melunasi gaji.' 
        });
    }
};

const getRekapGaji = async (req, res) => {
    try {
        const { tahun, bulan, tanggal_mulai, tanggal_selesai } = req.query;

        // 1. Validasi Parameter Wajib
        if (!tahun) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parameter tahun wajib disertakan.' 
            });
        }

        // 2. Bangun Query Supabase (Pilih kolom dengan LENGKAP)
        let query = supabase
            .from('penggajian')
            .select(`
                id,
                periode_bulan,
                periode_tahun,
                gaji_dasar,
                total_bonus,
                total_potongan,
                total_gaji,
                status_pembayaran,
                tanggal_awal_periode,
                tanggal_akhir_periode,
                
                detail_harian,        
                rincian_bonus,        
                rincian_potongan,     
                informasi_tabungan,   
                
                pegawai (
                    nama,
                    jabatan (
                        nama_jabatan,
                        tipe_penggajian,
                        departemen (nama_departemen)
                    )
                )
            `)
            .order('id', { ascending: false }); // Urutkan dari yang terbaru

        // 3. Terapkan Filter Berdasarkan Request Frontend
        query = query.eq('periode_tahun', tahun);
        
        // Filter berdasarkan tanggal mulai & tanggal selesai jika ada (misal filter mingguan)
        if (tanggal_mulai && tanggal_selesai) {
            query = query
                .gte('tanggal_awal_periode', tanggal_mulai)
                .lte('tanggal_akhir_periode', tanggal_selesai);
        } else if (bulan && bulan !== '0') {
            query = query.eq('periode_bulan', bulan);
        }

        // 4. Eksekusi Query
        const { data, error } = await query;

        if (error) throw error;

        // 5. Kembalikan Response ke Frontend
        return res.status(200).json({ 
            success: true, 
            message: 'Data rekap gaji berhasil diambil.',
            data: data 
        });

    } catch (error) {
        console.error('Error getRekapGaji:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Gagal mengambil data rekap gaji dari server.' 
        });
    }
};

module.exports = { pelunasanGaji, getAllGaji, getRekapMingguan, getRekapHarian, generateGajiMassal,getRekapGaji };