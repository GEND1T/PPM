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
const getNamaHari = (tanggalStr) => {
    const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return hari[new Date(tanggalStr).getDay()];
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
                // CEK STATUS GAJI SEBELUM MENGHITUNG
                // =======================================================
                const { data: existingGaji } = await supabase
                    .from('penggajian')
                    .select('status_pembayaran')
                    .eq('pegawai_id', pegawai.id)
                    .eq('periode_bulan', periode_bulan)
                    .eq('periode_tahun', periode_tahun)
                    .maybeSingle();

                if (existingGaji && existingGaji.status_pembayaran === 'Lunas') {
                    throw new Error('Slip Gaji sudah berstatus LUNAS. Data dikunci.');
                }

                // --- 1. HITUNG TABUNGAN LOYALITAS ---
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

                // =======================================================
                // 🚀 TENTUKAN UPAH DASAR BERDASARKAN TIPE PENGGAJIAN
                // =======================================================
                const tipeGaji = aturanJabatan.tipe_penggajian; // 'Bulanan', 'Harian', atau 'Target'
                const isBulanan = tipeGaji === 'Bulanan';
                const isHarian = tipeGaji === 'Harian';
                const isTarget = tipeGaji === 'Target';

                let upahDasar = 0;

                if (isBulanan) {
                    upahDasar = aturanJabatan.gaji_pokok_bulanan || 0;
                } else if (isTarget) {
                    // [BARU] Tarik data dari pencapaian target harian untuk upah dasar
                    const { data: targetData, error: errTarget } = await supabase
                        .from('pencapaian_target_harian')
                        .select('nominal_total_riil')
                        .eq('pegawai_id', pegawai.id)
                        .gte('tanggal', tanggal_mulai)
                        .lte('tanggal', tanggal_selesai);

                    if (!errTarget && targetData) {
                        // Jumlahkan semua nominal pencapaian riil di rentang tanggal tersebut
                        upahDasar = targetData.reduce((sum, item) => sum + Number(item.nominal_total_riil || 0), 0);
                    }
                }
                // Jika isHarian, upahDasar akan dihitung di dalam loop absensi di bawah.

                // --- 2. TARIK DATA ABSENSI ---
                const { data: dataAbsen, error: errAbsen } = await supabase
                    .from('absensi')
                    .select('status, upah_harian, bonus_kedisiplinan, bonus_kerapian, denda, upah_lembur') 
                    .eq('pegawai_id', pegawai.id)
                    .gte('tanggal', tanggal_mulai)
                    .lte('tanggal', tanggal_selesai);

                if (errAbsen) throw errAbsen;
                
                // Variabel Aggregator Dinamis
                let bonusDisiplinPeriodeIni = 0;
                let bonusKerapianPeriodeIni = 0;
                let uangLemburPeriodeIni = 0; 
                let dendaSistemPeriodeIni = 0; 
                let dendaAlphaVoid = 0; 
                
                let totalHariHadir = 0;
                const DENDA_ALPHA_PER_HARI = aturanJabatan.upah_per_kehadiran || 0; 

                // Siapkan array penampung rincian harian
                let arrayDetailHarian = [];

                if (isTarget) {
                    // --- LOGIKA TIPE TARGET ---
                    // Pastikan query mengambil relasi master_target untuk nama dan harga
                    const { data: targetData } = await supabase
                        .from('pencapaian_target_harian')
                        .select('tanggal, jumlah_pencapaian, nominal_total_riil, master_target(nama_target, harga_satuan)')
                        .eq('pegawai_id', pegawai.id)
                        .gte('tanggal', tanggal_mulai)
                        .lte('tanggal', tanggal_selesai)
                        .order('tanggal', { ascending: true });

                    if (targetData && targetData.length > 0) {
                        for (const target of targetData) {
                            const nominalRiil = Number(target.nominal_total_riil || 0);
                            upahDasar += nominalRiil;

                            // Push ke detail harian
                            arrayDetailHarian.push({
                                hari_tanggal: getNamaHari(target.tanggal),
                                nama_target: target.master_target?.nama_target || '-',
                                harga_satuan: target.master_target?.harga_satuan || 0,
                                capaian: target.jumlah_pencapaian || 0,
                                total_harian: nominalRiil
                            });
                        }
                    }
                }

                // --- LOGIKA TIPE HARIAN & BULANAN (Absensi) ---
                if (dataAbsen && dataAbsen.length > 0) {
                    for (const absen of dataAbsen) {
                        if (absen.status === 'void' || absen.status === 'alfa') {
                            if (isBulanan) dendaAlphaVoid += DENDA_ALPHA_PER_HARI; 
                        } else {
                            totalHariHadir++;
                            if (isHarian) upahDasar += (absen.upah_harian || 0);
                            
                            bonusDisiplinPeriodeIni += (absen.bonus_kedisiplinan || 0);
                            bonusKerapianPeriodeIni += (absen.bonus_kerapian || 0);
                            uangLemburPeriodeIni += (absen.upah_lembur || 0);
                            dendaSistemPeriodeIni += (absen.denda || 0);

                            // JIKA TIPE HARIAN, Push rekam jejak harian
                            if (isHarian) {
                                const totalHarian = (absen.upah_harian || 0) + (absen.bonus_kedisiplinan || 0) + (absen.bonus_kerapian || 0) + (absen.upah_lembur || 0);
                                arrayDetailHarian.push({
                                    hari_tanggal: getNamaHari(absen.tanggal),
                                    gaji_kehadiran: absen.upah_harian || 0,
                                    t_absensi: absen.bonus_kedisiplinan || 0,
                                    t_kerapian: absen.bonus_kerapian || 0,
                                    sortir: 0, // Isi 0 jika belum ada logika sortir
                                    lembur: absen.upah_lembur || 0,
                                    bonus: 0,  // Isi 0 jika belum ada logika bonus lain
                                    total_harian: totalHarian
                                });
                            }
                        }
                    }
                }

                // --- KALKULASI BONUS MINGGUAN ---
                let bonusKehadiranMingguan = 0;
                if (totalHariHadir === 4) {
                    bonusKehadiranMingguan = aturanJabatan.bonus_minggu_4_hari || 0;
                } else if (totalHariHadir === 5) {
                    bonusKehadiranMingguan = aturanJabatan.bonus_minggu_5_hari || 0;
                } else if (totalHariHadir >= 6) {
                    bonusKehadiranMingguan = aturanJabatan.bonus_minggu_6_hari || 0;
                }

                // =======================================================
                // 🔒 LOGIKA KASBON (Aman: Hanya Membaca, Tidak Mengurangi DB)
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
                        const potonganRiil = Math.min(kasbon.nominal_cicilan_per_gajian, kasbon.sisa_pinjaman);
                        totalPotonganKasbon += potonganRiil;
                        
                        // Metadata ini dikemas ke dalam JSON agar nanti bisa dibaca oleh fungsi pelunasanGaji
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
                    bonus_kerapian_harian: bonusKerapianPeriodeIni,
                    uang_lembur_akumulasi: Math.round(uangLemburPeriodeIni),
                    bonus_kehadiran_mingguan: bonusKehadiranMingguan
                };

                const rincianPotongan = {
                    denda_sistem_absensi: dendaSistemPeriodeIni,
                    denda_alpha_void: dendaAlphaVoid,
                    potongan_kasbon: totalPotonganKasbon, 
                    detail_kasbon: detailKasbonTerpotong  
                };

                const totalBonusCair = Object.values(rincianBonus).reduce((a, b) => a + (b || 0), 0);
                const totalPotonganCair = dendaSistemPeriodeIni + dendaAlphaVoid + totalPotonganKasbon;
                
                let gajiBersih = (upahDasar + totalBonusCair) - totalPotonganCair;

                if (gajiBersih < 0) {
                    gajiBersih = 0; 
                }

                // --- INFO TABUNGAN ---
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

                // --- 4. SIMPAN KE TABEL PENGGAJIAN ---
                const { error: errSaveGaji } = await supabase
                    .from('penggajian')
                    .upsert([{ 
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
                        status_pembayaran: 'Pending' // <--- Menunggu di-Lunas-kan oleh pelunasanGaji
                    }], {
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

module.exports = { generateGajiMassal };


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


module.exports = { pelunasanGaji, getAllGaji, getRekapMingguan, getRekapHarian, generateGajiMassal };