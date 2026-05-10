// File: src/services/absensiService.js

const supabase = require('../config/supabaseClient');
const { timeToMinutes } = require('../utils/admsParser');

async function prosesLogMesin(log) {
    const { pinMesin, tanggal, jam, state } = log;
    const menitScan = timeToMinutes(jam);

    // 1. Simpan selalu data mentah
    await supabase.from('log_mesin_absensi').insert({
        pin_mesin_mentah: pinMesin,
        waktu_scan: `${tanggal} ${jam}`,
        punch_state: state
    });

    // 2. Cari Pegawai
    const { data: pegawai, error: errPegawai } = await supabase
        .from('pegawai')
        .select('id, default_shift_id, jabatan(upah_per_kehadiran, bonus_disiplin_harian, upah_lembur_per_jam)')
        .eq('pin_mesin', pinMesin)
        .single();

    if (errPegawai || !pegawai || !pegawai.default_shift_id) return;

    // Ambil aturan Shift
    const { data: shift } = await supabase.from('shifts').select('*').eq('id', pegawai.default_shift_id).single();
    
    // 3. Cek absen hari ini
    const { data: absenHariIni, error: errAbsen } = await supabase
        .from('absensi')
        .select('*')
        .eq('pegawai_id', pegawai.id)
        .eq('tanggal', tanggal)
        .maybeSingle(); 

    const targetMasuk = timeToMinutes(shift.jam_masuk);
    const targetPulang = timeToMinutes(shift.jam_pulang);
    const batasToleransi = targetMasuk + shift.batas_toleransi_menit;
    const batasCutOffPulang = targetPulang + shift.batas_akhir_scan_pulang_menit;

    // --- LOGIKA INSERT (MASUK PERTAMA KALI) ---
    
    // Tentukan batas lockout (Penolakan masuk)
    const batasCutOffMasuk = targetMasuk + (shift.batas_akhir_scan_masuk_menit || 120);

    if (!absenHariIni) {
        
        // LAPIS 3 KEAMANAN: ENTRY DENIAL (Tolak absen jika terlalu siang)
        if (menitScan > batasCutOffMasuk) {
            console.log(`[WARNING] Scan ditolak! Melewati batas akhir absen masuk: PIN ${pinMesin} jam ${jam}`);
            return; // Abaikan proses insert. Pegawai dianggap tidak masuk/alfa.
        }

        let statusMasuk = 'late';
        let bonusDisiplin = 0;
        let dendaTerlambat = 0; // Variabel baru penampung denda pagi

        if (menitScan <= batasToleransi) {
            statusMasuk = menitScan < targetMasuk ? 'intime' : 'ontime';
            bonusDisiplin = pegawai.jabatan.bonus_disiplin_harian;
        } else {
            // PEGAWAI TERLAMBAT
            if (shift.is_potong_gaji_terlambat) {
                // Efek jera: Menit telat dihitung dari jam masuk resmi, BUKAN dari batas toleransi.
                // Misal masuk 07:00, toleransi 07:15. Jika absen 07:20, telatnya 20 menit!
                const menitTelat = menitScan - targetMasuk;
                dendaTerlambat = menitTelat * (shift.denda_terlambat_per_menit || 0);
                console.log(`[PENALTI] PIN ${pinMesin} telat ${menitTelat} menit. Denda Pagi: Rp ${dendaTerlambat}`);
            }
        }

        const { error: insertError } = await supabase.from('absensi').insert({
            pegawai_id: pegawai.id,
            tanggal: tanggal,
            shift_id: shift.id,
            waktu_awal: jam,
            status: statusMasuk,
            upah_harian: pegawai.jabatan.upah_per_kehadiran, // Upah pokok TETAP UTUH di sini
            bonus_kedisiplinan: bonusDisiplin,
            denda: dendaTerlambat // Masukkan denda keterlambatan ke kolom denda
        });

        if (insertError) console.error(`[ERROR INSERT] PIN ${pinMesin}:`, insertError.message);
        return;
    }

    // --- LOGIKA UPDATE (PULANG) ---

    const menitAwal = timeToMinutes(absenHariIni.waktu_awal);

    // [FITUR] ANTI-SPAM DOUBLE TAP (COOLDOWN 30 MENIT)
    if (menitScan - menitAwal < 30) {
        console.log(`[INFO] Scan double-tap/spam diabaikan: PIN ${pinMesin} jam ${jam}`);
        return; 
    }

    // 1. CEK SURAT PERINTAH LEMBUR
    const { data: spl } = await supabase
        .from('otorisasi_lembur')
        .select('menit_lembur_diizinkan')
        .eq('pegawai_id', pegawai.id)
        .eq('tanggal', tanggal)
        .maybeSingle();

    // 2. TENTUKAN CUT-OFF DINAMIS
    let batasCutOffAktual = batasCutOffPulang;

    if (spl) {
        const cutOffLembur = targetPulang + spl.menit_lembur_diizinkan + 60; 
        batasCutOffAktual = Math.max(batasCutOffPulang, cutOffLembur);
    }

    // 3. LAPIS 1: EKSEKUSI CUT-OFF
    if (menitScan > batasCutOffAktual) {
        console.log(`[INFO] Scan pulang ditolak (melebihi cut-off aktual): PIN ${pinMesin} jam ${jam}`);
        return; 
    }

    // 4. LAPIS 2: KALKULASI PULANG AWAL & LEMBUR 
    let menitLemburMesin = 0;
    let menitLemburDiakui = 0;
    let upahLembur = 0;
    
    // [FITUR] AUTO-RECOVERY HAK PAGI HARI
    let statusPagi = 'late';
    let hakBonusPagi = 0;
    
    if (menitAwal <= batasToleransi) {
        statusPagi = menitAwal < targetMasuk ? 'intime' : 'ontime';
        hakBonusPagi = pegawai.jabatan.bonus_disiplin_harian || 0;
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
                dendaPulangAwal = menitBolos * (shift.denda_pulang_awal_per_menit || 0);
            }
        }
    }

    // SKENARIO B: LEMBUR / PULANG NORMAL
    else if (menitScan > targetPulang) {
        menitLemburMesin = menitScan - targetPulang;

        if (spl) {
            menitLemburDiakui = Math.min(menitLemburMesin, spl.menit_lembur_diizinkan);
            const jamLembur = Math.floor(menitLemburDiakui / 60); 
            upahLembur = jamLembur * pegawai.jabatan.upah_lembur_per_jam;
        }
    }
    
    const dendaHariIni = (absenHariIni.denda || 0) + dendaPulangAwal;

    // 5. UPDATE DATABASE ABSENSI
    const { error: updateError } = await supabase.from('absensi').update({
        waktu_akhir: jam,
        status: statusAkhir,
        bonus_kedisiplinan: bonusKedisiplinanAkhir,
        denda: dendaHariIni, // Simpan total akumulasi denda
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