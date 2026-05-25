// File: src/cron/rekapTasks.js

const cron = require('node-cron');
const supabase = require('../config/supabaseClient');

async function prosesRekapMingguan() {
    console.log('⏳ [CRON] Menjalankan Rekap Mingguan & Akumulasi Tabungan THR...');

    // 1. Tentukan Rentang Waktu (7 Hari Kebelakang dari hari ini)
    const today = new Date();
    const pastWeek = new Date();
    pastWeek.setDate(today.getDate() - 6);

    const endDate = today.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD
    const startDate = pastWeek.toLocaleDateString('en-CA');
    const tahunIni = today.getFullYear();

    try {
        // 2. Ambil semua data pegawai beserta master aturan jabatannya
        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, jabatan(bonus_minggu_6_hari, bonus_minggu_5_hari, bonus_minggu_harian, bonus_lembur_tahunan)');

        if (errPegawai) throw errPegawai;

        // 3. Looping perhitungan untuk setiap pegawai
        for (let pegawai of listPegawai) {
            // Tarik data absen selama seminggu terakhir
            const { data: absensiMingguIni, error: errAbsen } = await supabase
                .from('absensi')
                .select('*')
                .eq('pegawai_id', pegawai.id)
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);

            if (errAbsen || !absensiMingguIni || absensiMingguIni.length === 0) continue;

            let totalHadir = absensiMingguIni.length;
            let totalPokok = 0;
            let totalKerapian = 0;
            let totalDisiplin = 0;
            let totalDenda = 0;
            let totalUpahLemburHarian = 0; // Uang lembur yang dicairkan mingguan
            let totalMenitLembur = 0;

            // Akumulasi data harian
            for (let absen of absensiMingguIni) {
                totalPokok += (absen.upah_harian || 0);
                totalKerapian += (absen.bonus_kerapian || 0);
                totalDisiplin += (absen.bonus_kedisiplinan || 0);
                totalDenda += (absen.denda || 0);
                totalUpahLemburHarian += (absen.upah_lembur || 0);
                totalMenitLembur += (absen.menit_lembur_diakui || 0);
            }

            // A. KALKULASI PENDAPATAN BERSIH MINGGUAN (Gaji Cair)
            // Rumus: (Pokok + Kerapian + Disiplin + Upah Lembur Harian) - Denda
            let pendapatanBersih = (totalPokok + totalKerapian + totalDisiplin + totalUpahLemburHarian) - totalDenda;
            if (pendapatanBersih < 0) pendapatanBersih = 0;

            // B. TENTUKAN BONUS MINGGUAN (Untuk Ditabung ke THR)
            let tipeBonus = '<=4';
            let nominalBonusMingguanDidapat = 0;

            if (totalHadir >= 6) {
                tipeBonus = '6';
                nominalBonusMingguanDidapat = pegawai.jabatan.bonus_minggu_6_hari || 0;
            } else if (totalHadir === 5) {
                tipeBonus = '5';
                nominalBonusMingguanDidapat = pegawai.jabatan.bonus_minggu_5_hari || 0;
            } else {
                nominalBonusMingguanDidapat = (pegawai.jabatan.bonus_minggu_harian || 0) * totalHadir;
            }

            // 4. SIMPAN KE TABEL REKAP MINGGUAN
            await supabase.from('rekap_mingguan').insert({
                pegawai_id: pegawai.id,
                tanggal_mulai: startDate,
                tanggal_akhir: endDate,
                total_hari_hadir: totalHadir,
                total_gaji_pokok_mingguan: totalPokok,
                total_bonus_kerapian_mingguan: totalKerapian,
                total_bonus_disiplin_mingguan: totalDisiplin,
                total_denda_mingguan: totalDenda,
                tipe_bonus_mingguan_didapat: tipeBonus,
                total_pendapatan_bersih_mingguan: pendapatanBersih
            });

            // 5. UPDATE TABEL HARI RAYA (CELENGAN THR)
            const jamLemburMingguIni = totalMenitLembur / 60;
            
            // Cek apakah celengan tahun ini sudah dibuat
            const { data: recordTHR } = await supabase
                .from('rekap_tahunan_hari_raya')
                .select('*')
                .eq('pegawai_id', pegawai.id)
                .eq('periode_tahun', tahunIni)
                .maybeSingle(); // Gunakan maybeSingle agar tidak error jika data belum ada

            if (recordTHR) {
                // Jika sudah ada, tambahkan saldonya
                const jamLemburBaru = (recordTHR.total_jam_lembur_setahun || 0) + jamLemburMingguIni;
                const bonusLemburTahunanBaru = jamLemburBaru * (pegawai.jabatan.bonus_lembur_tahunan || 0);

                await supabase.from('rekap_tahunan_hari_raya').update({
                    total_hadir_setahun: (recordTHR.total_hadir_setahun || 0) + totalHadir,
                    total_jam_lembur_setahun: jamLemburBaru,
                    total_bonus_mingguan_terkumpul: (recordTHR.total_bonus_mingguan_terkumpul || 0) + nominalBonusMingguanDidapat,
                    nominal_bonus_lembur_tahunan: bonusLemburTahunanBaru
                }).eq('id', recordTHR.id);
            } else {
                // Jika belum ada (awal tahun), buat celengan baru
                const bonusLemburTahunanBaru = jamLemburMingguIni * (pegawai.jabatan.bonus_lembur_tahunan || 0);
                
                await supabase.from('rekap_tahunan_hari_raya').insert({
                    pegawai_id: pegawai.id,
                    periode_tahun: tahunIni,
                    total_hadir_setahun: totalHadir,
                    total_jam_lembur_setahun: jamLemburMingguIni,
                    total_bonus_mingguan_terkumpul: nominalBonusMingguanDidapat,
                    nominal_bonus_lembur_tahunan: bonusLemburTahunanBaru
                });
            }
            console.log(`✅ [CRON] Rekap Mingguan & THR Pegawai ID ${pegawai.id} berhasil diproses.`);
        }

        console.log('🎉 [CRON] Seluruh proses Rekap Mingguan selesai!');

    } catch (error) {
        console.error('❌ [CRON] Terjadi kesalahan saat Rekap Mingguan:', error.message);
    }
}

// Inisialisasi Jadwal
function initRekapCronJobs() {
    // Format Cron: Menit Jam Tanggal Bulan Hari (0 = Minggu, 6 = Sabtu)
    // Berjalan setiap Sabtu jam 23:00
    cron.schedule('* 23 * * *', () => {
        prosesRekapMingguan();
    });
    console.log('⏱️  Cron Jobs Rekap Mingguan (Sabtu 23:00) berhasil diinisialisasi.');
}

module.exports = { initRekapCronJobs, prosesRekapMingguan };