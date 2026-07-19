// File: src/services/absensiService.js

const supabase = require('../config/supabaseClient');
const { timeToMinutes } = require('../utils/admsParser');

async function prosesLogMesin(log) {
    const { pinMesin, tanggal, jam, state } = log;
    const menitScan = timeToMinutes(jam);

    // 1. Simpan selalu data mentah (Sebagai Blackbox/Bukti)
    await supabase.from('log_mesin_absensi').insert({
        pin_mesin_mentah: pinMesin,
        waktu_scan: `${tanggal} ${jam}`,
        punch_state: state
    });

    // 2. Cari Data Pegawai Dasar (Untuk Upah & Bonus)
    const { data: pegawai, error: errPegawai } = await supabase
        .from('pegawai')
        .select('id, jabatan(upah_per_kehadiran, bonus_disiplin_harian, upah_lembur_per_jam)')
        .eq('pin_mesin', pinMesin)
        .single();

    if (errPegawai || !pegawai) {
        console.log(`[INFO] PIN Mesin ${pinMesin} tidak terdaftar di database pegawai.`);
        return;
    }

    // =========================================================================
    // CARI JADWAL HARI INI DARI TABEL `jadwal_karyawan`
    // =========================================================================
    const { data: jadwalHariIni, error: errJadwal } = await supabase
        .from('jadwal_karyawan')
        .select('shift_id')
        .eq('pegawai_id', pegawai.id)
        .eq('tanggal', tanggal)
        .maybeSingle();

    if (errJadwal || !jadwalHariIni || !jadwalHariIni.shift_id) {
        console.log(`[INFO] Scan diabaikan. Pegawai PIN ${pinMesin} tidak memiliki jadwal shift (OFF) pada ${tanggal}.`);
        return; 
    }

    const { data: shift } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', jadwalHariIni.shift_id)
        .single();

    if (!shift) return;

    // 3. Cek apakah pegawai sudah melakukan absensi (scan masuk) hari ini
    const { data: absenHariIni, error: errAbsen } = await supabase
        .from('absensi')
        .select('*')
        .eq('pegawai_id', pegawai.id)
        .eq('tanggal', tanggal)
        .maybeSingle(); 

    const targetMasuk = timeToMinutes(shift.jam_masuk);
    const targetPulang = timeToMinutes(shift.jam_pulang);
    const batasToleransi = targetMasuk + shift.batas_toleransi_menit;

    // --- LOGIKA INSERT (MASUK PERTAMA KALI) ---
    
    if (!absenHariIni) {
        
        // LAPIS 3 KEAMANAN: ENTRY DENIAL (Tolak absen jika terlalu siang)
        // Mengecek apakah batas akhir scan masuk diaktifkan (tidak bernilai 0)
        if (shift.batas_akhir_scan_masuk_menit !== 0) {
            // Gunakan ?? agar nilai 0 tidak tertimpa 120 (walau 0 sudah dicegat di atas)
            const batasCutOffMasuk = targetMasuk + (shift.batas_akhir_scan_masuk_menit ?? 120);
            if (menitScan > batasCutOffMasuk) {
                console.log(`[WARNING] Scan ditolak! Melewati batas akhir absen masuk: PIN ${pinMesin} jam ${jam}`);
                return; // Abaikan proses insert. Pegawai dianggap tidak masuk/alfa.
            }
        }

        let statusMasuk = 'late';
        let bonusDisiplin = 0;
        let dendaTerlambat = 0; 

        if (menitScan <= batasToleransi) {
            statusMasuk = menitScan < targetMasuk ? 'intime' : 'ontime';
            bonusDisiplin = pegawai.jabatan?.bonus_disiplin_harian || 0;
        } else {
            // PEGAWAI TERLAMBAT
            if (shift.is_potong_gaji_terlambat) {
                const menitTelat = menitScan - targetMasuk;
                
                // PENGKONDISIAN JENIS DENDA: TETAP vs MULTIPLIER (PER MENIT)
                if (shift.istetap) {
                    dendaTerlambat = shift.denda_terlambat_per_menit || 0; // Denda flat/tetap
                } else {
                    dendaTerlambat = menitTelat * (shift.denda_terlambat_per_menit || 0); // Denda progresif
                }
                
                console.log(`[PENALTI] PIN ${pinMesin} telat ${menitTelat} menit. Denda Pagi: Rp ${dendaTerlambat}`);
            }
        }

        const { error: insertError } = await supabase.from('absensi').insert({
            pegawai_id: pegawai.id,
            tanggal: tanggal,
            shift_id: shift.id, 
            waktu_awal: jam,
            status: statusMasuk,
            upah_harian: pegawai.jabatan?.upah_per_kehadiran || 0, 
            bonus_kedisiplinan: bonusDisiplin,
            denda: dendaTerlambat 
        });

        if (insertError) console.error(`[ERROR INSERT] PIN ${pinMesin}:`, insertError.message);
        return;
    }

    // --- LOGIKA UPDATE (PULANG) ---

    const menitAwal = timeToMinutes(absenHariIni.waktu_awal);

    if (menitScan - menitAwal < 30) {
        console.log(`[INFO] Scan double-tap/spam diabaikan: PIN ${pinMesin} jam ${jam}`);
        return; 
    }

    // 1. CEK SURAT PERINTAH LEMBUR
    const { data: spl } = await supabase
        .from('otorisasi_lembur')
        // SUNTIKKAN DUA KOLOM BARU DI SINI:
        .select('menit_lembur_diizinkan, is_custom_upah, nominal_upah_custom') 
        .eq('pegawai_id', pegawai.id)
        .eq('tanggal', tanggal)
        .maybeSingle();

    // 2. TENTUKAN CUT-OFF DINAMIS
    const batasCutOffPulang = targetPulang + shift.batas_akhir_scan_pulang_menit;
    let batasCutOffAktual = batasCutOffPulang;

    if (spl) {
        const cutOffLembur = targetPulang + spl.menit_lembur_diizinkan + 60; 
        batasCutOffAktual = Math.max(batasCutOffPulang, cutOffLembur);
    }

    // 3. LAPIS 1: EKSEKUSI CUT-OFF
    // Mengecek apakah batas akhir scan pulang diaktifkan (tidak bernilai 0)
    if (shift.batas_akhir_scan_pulang_menit !== 0) {
        if (menitScan > batasCutOffAktual) {
            console.log(`[INFO] Scan pulang ditolak (melebihi cut-off aktual): PIN ${pinMesin} jam ${jam}`);
            return; 
        }
    }

    // 4. LAPIS 2: KALKULASI PULANG AWAL & LEMBUR 
    let menitLemburMesin = 0;
    let menitLemburDiakui = 0;
    let upahLembur = 0;
    
    let statusPagi = 'late';
    let hakBonusPagi = 0;
    
    if (menitAwal <= batasToleransi) {
        statusPagi = menitAwal < targetMasuk ? 'intime' : 'ontime';
        hakBonusPagi = pegawai.jabatan?.bonus_disiplin_harian || 0;
    }

    let statusAkhir = statusPagi; 
    let bonusKedisiplinanAkhir = hakBonusPagi;
    let dendaPulangAwal = 0;

    // SKENARIO A: PULANG LEBIH CEPAT (Early Departure)
    if (menitScan < targetPulang) {
        statusAkhir = 'pulang_awal';
        bonusKedisiplinanAkhir = 0; 
        
        if (shift.is_potong_gaji_pulang_awal) {
            const menitBolos = targetPulang - menitScan;
            if (menitBolos > (shift.toleransi_pulang_awal_menit || 0)) {
                
                // PENGKONDISIAN JENIS DENDA: TETAP vs MULTIPLIER (PER MENIT)
                if (shift.istetap) {
                    dendaPulangAwal = shift.denda_pulang_awal_per_menit || 0; // Denda flat/tetap
                } else {
                    dendaPulangAwal = menitBolos * (shift.denda_pulang_awal_per_menit || 0); // Denda progresif
                }
                
            }
        }
    }
    /// SKENARIO B: LEMBUR / PULANG NORMAL
    else if (menitScan > targetPulang) {
        menitLemburMesin = menitScan - targetPulang;

        if (spl) {
            menitLemburDiakui = Math.min(menitLemburMesin, spl.menit_lembur_diizinkan);
            const jamLembur = Math.floor(menitLemburDiakui / 60); 
            
            // =============================================================
            // FITUR BARU: PENGECEKAN UPAH LEMBUR CUSTOM
            // =============================================================
            let tarifLemburPerJam = pegawai.jabatan?.upah_lembur_per_jam || 0; // Default dari Jabatan

            // Jika admin mengaktifkan custom upah di SPL, timpa tarif defaultnya
            if (spl.is_custom_upah && spl.nominal_upah_custom > 0) {
                tarifLemburPerJam = spl.nominal_upah_custom;
            }
            
            // Hitung upah akhir menggunakan tarif yang terpilih
            upahLembur = jamLembur * tarifLemburPerJam;
            // =============================================================
        }
    }
    
    const dendaHariIni = (absenHariIni.denda || 0) + dendaPulangAwal;

    // 5. UPDATE DATABASE ABSENSI
    const { error: updateError } = await supabase.from('absensi').update({
        waktu_akhir: jam,
        status: statusAkhir,
        bonus_kedisiplinan: bonusKedisiplinanAkhir,
        denda: dendaHariIni, 
        menit_lembur_mesin: menitLemburMesin,
        menit_lembur_diakui: menitLemburDiakui,
        upah_lembur: upahLembur
    }).eq('id', absenHariIni.id);

    if (updateError) {
        console.error(`[ERROR UPDATE] Gagal update absensi PIN ${pinMesin}:`, updateError.message);
    } else {
        console.log(`[SUCCESS] Absensi pulang PIN ${pinMesin} berhasil diupdate.`);
    }
}

module.exports = { prosesLogMesin };