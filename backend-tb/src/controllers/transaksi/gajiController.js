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

                // 1. CEK STATUS GAJI
                const { data: existingGaji } = await supabase
                    .from('penggajian')
                    .select('status_pembayaran')
                    .eq('pegawai_id', pegawai.id)
                    .eq('periode_bulan', periode_bulan)
                    .eq('periode_tahun', periode_tahun)
                    .maybeSingle();

                if (existingGaji && existingGaji.status_pembayaran === 'Lunas') {
                    throw new Error('Slip Gaji sudah LUNAS. Data dikunci.');
                }

                const tipeGaji = aturanJabatan.tipe_penggajian; 
                const isBulanan = tipeGaji === 'Bulanan';
                const isHarian = tipeGaji === 'Harian';
                const isTarget = tipeGaji === 'Target';
                let upahDasar = isBulanan ? (aturanJabatan.gaji_pokok_bulanan || 0) : 0;

                // 2. TARIK DATA TARGET (Jika Target)
                let targetData = [];
                if (isTarget) {
                    const { data: tData } = await supabase
                        .from('pencapaian_target_harian')
                        .select('tanggal, jumlah_pencapaian, nominal_total_riil, master_target(nama_target, harga_satuan)')
                        .eq('pegawai_id', pegawai.id)
                        .gte('tanggal', tanggal_mulai)
                        .lte('tanggal', tanggal_selesai)
                        .order('tanggal', { ascending: true });
                    
                    targetData = tData || [];
                    upahDasar = targetData.reduce((sum, item) => sum + Number(item.nominal_total_riil || 0), 0);
                }

                // 3. TARIK DATA ABSENSI
                const { data: dataAbsen, error: errAbsen } = await supabase
                    .from('absensi')
                    .select('tanggal, status, upah_harian, bonus_kedisiplinan, bonus_kerapian, denda, upah_lembur')
                    .eq('pegawai_id', pegawai.id)
                    .gte('tanggal', tanggal_mulai)
                    .lte('tanggal', tanggal_selesai)
                    .order('tanggal', { ascending: true });

                if (errAbsen) throw errAbsen;

                // ===============================================================
                // PENGONDISIAN: SKIP PEGAWAI TANPA AKTIVITAS (Solusi Optimasi Server)
                // ===============================================================
                const absenAda = dataAbsen && dataAbsen.length > 0;
                const targetAda = targetData && targetData.length > 0;
                
                if (!absenAda && !targetAda) {
                    throw new Error("Tidak ada data kehadiran/target (Dilewati).");
                }

                // VARIABEL AGGREGATOR
                let bonusDisiplinPeriodeIni = 0;
                let bonusKerapianPeriodeIni = 0;
                let uangLemburPeriodeIni = 0; 
                let dendaSistemPeriodeIni = 0; 
                let dendaAlphaVoid = 0; 
                let totalHariHadir = 0;
                const DENDA_ALPHA_PER_HARI = aturanJabatan.upah_per_kehadiran || 0; 

                let arrayDetailHarian = [];
                
                // Helper format Tanggal yang lebih solid
                const getNamaHari = (tgl) => {
                    if (!tgl) return "-";
                    const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                    return hari[new Date(tgl).getDay()];
                };

                const mapAbsen = {};
                
                // 4. LOGIKA ABSENSI (Harian & Bulanan)
                if (absenAda) {
                    for (const absen of dataAbsen) {
                        mapAbsen[absen.tanggal] = absen;

                        if (absen.status === 'void' || absen.status === 'alfa') {
                            if (isBulanan) dendaAlphaVoid += DENDA_ALPHA_PER_HARI; 
                        } else {
                            totalHariHadir++;
                            if (isHarian) upahDasar += (absen.upah_harian || 0);
                            
                            bonusDisiplinPeriodeIni += (absen.bonus_kedisiplinan || 0);
                            bonusKerapianPeriodeIni += (absen.bonus_kerapian || 0);
                            uangLemburPeriodeIni += (absen.upah_lembur || 0);
                            dendaSistemPeriodeIni += (absen.denda || 0);

                            // BENTUK DETAIL HARIAN KHUSUS TIPE HARIAN
                            if (isHarian) {
                                const totalHarian = (absen.upah_harian || 0) + (absen.bonus_kedisiplinan || 0) + (absen.bonus_kerapian || 0) + (absen.upah_lembur || 0);
                                arrayDetailHarian.push({
                                    hari_tanggal: getNamaHari(absen.tanggal),
                                    gaji_kehadiran: absen.upah_harian || 0,
                                    t_absensi: absen.bonus_kedisiplinan || 0,
                                    t_kerapian: absen.bonus_kerapian || 0,
                                    sortir: 0, 
                                    lembur: absen.upah_lembur || 0,
                                    bonus: 0, 
                                    total_harian: totalHarian
                                });
                            }
                        }
                    }
                }

                // 5. BENTUK DETAIL HARIAN KHUSUS TIPE TARGET
                if (isTarget && targetAda) {
                    for (const target of targetData) {
                        const tgl = target.tanggal;
                        const absenHariIni = mapAbsen[tgl] || {}; 
                        
                        const nominalRiil = Number(target.nominal_total_riil || 0);
                        const tAbs = absenHariIni.bonus_kedisiplinan || 0;
                        const tKrp = absenHariIni.bonus_kerapian || 0;
                        const lembur = absenHariIni.upah_lembur || 0;
                        
                        arrayDetailHarian.push({
                            hari_tanggal: getNamaHari(tgl),
                            nama_target: target.master_target?.nama_target || '-',
                            harga_satuan: target.master_target?.harga_satuan || 0,
                            capaian: target.jumlah_pencapaian || 0,
                            t_absensi: tAbs,
                            t_kerapian: tKrp,
                            lembur: lembur,
                            sortir: 0,
                            bonus: 0,
                            total_harian: nominalRiil + tAbs + tKrp + lembur
                        });
                    }
                }

                // 6. KALKULASI BONUS MINGGUAN
                let bonusKehadiranMingguan = 0;
                if (totalHariHadir === 4) bonusKehadiranMingguan = aturanJabatan.bonus_minggu_4_hari || 0;
                else if (totalHariHadir === 5) bonusKehadiranMingguan = aturanJabatan.bonus_minggu_5_hari || 0;
                else if (totalHariHadir >= 6) bonusKehadiranMingguan = aturanJabatan.bonus_minggu_6_hari || 0;

                // 7. TARIK DATA KASBON (Menyimpan Sisa Pinjaman)
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
                        const potonganRiil = Math.min(kasbon.nominal_cicilan_per_gajian, kasbon.sisa_pinjaman);
                        totalPotonganKasbon += potonganRiil;
                        
                        detailKasbonTerpotong.push({
                            kasbon_id: kasbon.id,
                            keterangan: kasbon.keterangan_pinjaman,
                            nominal_potongan: potonganRiil,
                            sisa_pinjaman_terkini: kasbon.sisa_pinjaman - potonganRiil
                        });
                    }
                }

                // =======================================================
                // [FITUR BARU] TARIK BONUS MANUAL / CUSTOM
                // =======================================================
                const { data: daftarBonusCustom } = await supabase
                    .from('bonus_custom_pegawai')
                    .select('keterangan, nominal')
                    .eq('pegawai_id', pegawai.id)
                    .gte('tanggal_diberikan', tanggal_mulai)
                    .lte('tanggal_diberikan', tanggal_selesai);

                let totalBonusCustom = 0;
                let detailBonusCustom = [];

                if (daftarBonusCustom && daftarBonusCustom.length > 0) {
                    for (const bonus of daftarBonusCustom) {
                        totalBonusCustom += Number(bonus.nominal);
                        detailBonusCustom.push({
                            keterangan: bonus.keterangan,
                            nominal: Number(bonus.nominal)
                        });
                    }
                }

                // --- 8. RAKIT KOMPONEN JSON ---
                const rincianBonus = {
                    bonus_kedisiplinan_harian: bonusDisiplinPeriodeIni,
                    bonus_kerapian_harian: bonusKerapianPeriodeIni,
                    uang_lembur_akumulasi: Math.round(uangLemburPeriodeIni),
                    bonus_kehadiran_mingguan: bonusKehadiranMingguan,
                    // SUNTIKAN BONUS CUSTOM
                    total_bonus_custom: totalBonusCustom,
                    detail_bonus_custom: detailBonusCustom 
                };

                // Pastikan perhitungan Total Bonus Cair ikut menjumlahkan bonus custom
                const totalBonusCair = Object.values(rincianBonus).reduce((a, b) => {
                    // Cek jika valuenya number (abaikan array/object seperti detail_bonus_custom)
                    return typeof b === 'number' ? a + b : a;
                }, 0);

                const rincianPotongan = {
                    denda_sistem_absensi: dendaSistemPeriodeIni,
                    denda_alpha_void: dendaAlphaVoid,
                    potongan_kasbon: totalPotonganKasbon, 
                    detail_kasbon: detailKasbonTerpotong  
                };

                const totalPotonganCair = dendaSistemPeriodeIni + dendaAlphaVoid + totalPotonganKasbon;
                let gajiBersih = (upahDasar + totalBonusCair) - totalPotonganCair;
                if (gajiBersih < 0) gajiBersih = 0; 

                // 9. HITUNG TABUNGAN LOYALITAS & THR
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
                            .select('nominal_pengali').eq('jabatan_id', pegawai.jabatan_id)
                            .lte('minimal_tahun', masaKerjaTahun).order('minimal_tahun', { ascending: false }).limit(1);

                        if (tierMasaKerja && tierMasaKerja.length > 0) {
                            tabunganLoyalitas = masaKerjaTahun * (tierMasaKerja[0].nominal_pengali || 0);
                        }
                    }
                }

                const { data: recordTHR } = await supabase
                    .from('rekap_tahunan_hari_raya')
                    .select('total_bonus_mingguan_terkumpul, nominal_bonus_lembur_tahunan')
                    .eq('pegawai_id', pegawai.id).eq('periode_tahun', periode_tahun).maybeSingle();

                const infoTabungan = {
                    tabungan_loyalitas_akumulasi: tabunganLoyalitas,
                    tabungan_mingguan_terkumpul: recordTHR?.total_bonus_mingguan_terkumpul || 0,
                    tabungan_lembur_tahunan_terkumpul: recordTHR?.nominal_bonus_lembur_tahunan || 0
                };

                // 10. SIMPAN KE TABEL PENGGAJIAN
                const { error: errSaveGaji } = await supabase
                    .from('penggajian')
                    .upsert([{ 
                        pegawai_id: pegawai.id, 
                        periode_bulan, periode_tahun, 
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
                    }], { onConflict: 'pegawai_id,periode_bulan,periode_tahun' });

                if (errSaveGaji) throw errSaveGaji;

                if (recordTHR) {
                    await supabase.from('rekap_tahunan_hari_raya').update({ saldo_loyalitas: tabunganLoyalitas })
                        .eq('pegawai_id', pegawai.id).eq('periode_tahun', periode_tahun);
                } else {
                    await supabase.from('rekap_tahunan_hari_raya').insert([{
                        pegawai_id: pegawai.id, periode_tahun: periode_tahun, saldo_loyalitas: tabunganLoyalitas
                    }]);
                }

                berhasil++;

            } catch (error) {
                // Error di sini berarti dilewati (karena kosong atau Lunas)
                gagal++;
            }
        }

        return res.status(200).json({ success: true, message: `Selesai. ${berhasil} Slip Gaji diproses, ${gagal} dilewati.` });

    } catch (error) {
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
            .select('id, pegawai_id, status_pembayaran, rincian_potongan')
            .eq('id', id)
            .single();

        if (errSlip || !slipGaji) {
            return res.status(404).json({ success: false, message: 'Data slip gaji tidak ditemukan.' });
        }

        // 2. Proteksi Double-Execution
        if (slipGaji.status_pembayaran === 'Lunas') {
            return res.status(400).json({ success: false, message: 'Slip gaji ini sudah berstatus LUNAS sebelumnya.' });
        }

        // 3. EKSEKUSI PENGURANGAN UTANG KASBON (Jika ada)
        const detailKasbon = slipGaji.rincian_potongan?.detail_kasbon;
        
        if (detailKasbon && detailKasbon.length > 0) {
            for (const item of detailKasbon) {
                // Tarik sisa pinjaman terbaru langsung dari database untuk menghindari race condition
                const { data: kasbonAsli } = await supabase
                    .from('kasbon')
                    .select('sisa_pinjaman')
                    .eq('id', item.kasbon_id)
                    .single();
                
                if (kasbonAsli) {
                    const sisaBaru = kasbonAsli.sisa_pinjaman - item.nominal_potongan;
                    // Jika sisa utang <= 0, otomatis statusnya menjadi Lunas
                    const statusBaru = sisaBaru <= 0 ? 'Lunas' : 'Disetujui'; 

                    // Update tabel kasbon
                    const { error: errUpdateKasbon } = await supabase
                        .from('kasbon')
                        .update({ sisa_pinjaman: Math.max(0, sisaBaru), status: statusBaru })
                        .eq('id', item.kasbon_id);

                    if (errUpdateKasbon) {
                        console.error(`Gagal memotong kasbon ID ${item.kasbon_id}:`, errUpdateKasbon.message);
                        // Idealnya menggunakan transaksi DB, namun di Supabase JS client kita log errornya
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

        return res.status(200).json({ 
            success: true, 
            message: 'Slip gaji berhasil dilunasi. Saldo kasbon terkait (jika ada) telah otomatis terpotong.' 
        });

    } catch (error) {
        console.error('Error pelunasanGaji:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat melunasi gaji.' });
    }
};

const getRekapGaji = async (req, res) => {
    try {
        const { tahun, bulan } = req.query;

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
                        tipe_penggajian
                    )
                )
            `)
            .order('id', { ascending: false }); // Urutkan dari yang terbaru

        // 3. Terapkan Filter Berdasarkan Request Frontend
        query = query.eq('periode_tahun', tahun);
        
        // Jika bulan dikirim (dan bukan 0), maka filter berdasarkan bulan
        if (bulan && bulan !== '0') {
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