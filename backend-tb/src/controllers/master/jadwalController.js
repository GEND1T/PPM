
const supabase = require('../../config/supabaseClient');


// Endpoint: GET /api/v1/jadwal?start_date=2026-05-21&end_date=2026-06-20
const getAllJadwal = async (req, res) => {
    try {
        // Ambil parameter tanggal mulai dan selesai dari query URL
        const { start_date, end_date, pegawai_id } = req.query;

        let query = supabase
            .from('jadwal_karyawan')
            .select(`
                id, 
                tanggal, 
                pegawai_id,
                pegawai (nama, jabatan (nama_jabatan)),
                shift_id,
                shifts (kode_shift, jam_masuk, jam_pulang)
            `)
            .order('tanggal', { ascending: true });

        if (pegawai_id) query = query.eq('pegawai_id', pegawai_id);

        // Filter dinamis berdasarkan rentang tanggal
        if (start_date && end_date) {
            query = query.gte('tanggal', start_date).lte('tanggal', end_date);
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllJadwal:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data jadwal.' });
    }
};

// =========================================================================
// 2. CREATE: Tambah Jadwal Satuan (Manual / Override)
// =========================================================================
// Endpoint: POST /api/v1/jadwal
const createJadwalSatuan = async (req, res) => {
    try {
        const { pegawai_id, tanggal, shift_id } = req.body;

        if (!pegawai_id || !tanggal || !shift_id) {
            return res.status(400).json({ success: false, message: 'Data pegawai, tanggal, dan shift wajib diisi.' });
        }

        // Proteksi: Cek apakah pegawai sudah punya jadwal di tanggal tersebut
        const { data: cekJadwal } = await supabase
            .from('jadwal_karyawan')
            .select('id')
            .eq('pegawai_id', pegawai_id)
            .eq('tanggal', tanggal)
            .maybeSingle();

        if (cekJadwal) {
            return res.status(400).json({ 
                success: false, 
                message: 'Pegawai sudah memiliki jadwal pada tanggal tersebut. Gunakan fungsi Update.' 
            });
        }

        const { data, error } = await supabase
            .from('jadwal_karyawan')
            .insert([{ pegawai_id, tanggal, shift_id }])
            .select();

        if (error) throw error;

        return res.status(201).json({ success: true, message: 'Jadwal berhasil ditambahkan.', data });
    } catch (error) {
        console.error('Error createJadwalSatuan:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menambahkan jadwal.' });
    }
};

// =========================================================================
// 3. CREATE BULK: Generate Jadwal Massal (Dukung Default Shift & Override)
// =========================================================================
// Endpoint: POST /api/v1/jadwal/generate-massal
const generateJadwalMassal = async (req, res) => {
    try {
        const { list_pegawai_ids, tanggal_mulai, tanggal_selesai, shift_id } = req.body;

        if (!list_pegawai_ids || list_pegawai_ids.length === 0 || !tanggal_mulai || !tanggal_selesai) {
            return res.status(400).json({ success: false, message: 'Parameter pembuatan massal tidak lengkap.' });
        }

        // 1. Ambil data pegawai beserta default_shift_id-nya dari database
        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, default_shift_id')
            .in('id', list_pegawai_ids); // Mengambil data khusus untuk ID yang dicentang admin

        if (errPegawai) throw errPegawai;

        const start = new Date(tanggal_mulai);
        const end = new Date(tanggal_selesai);
        const listJadwalBaru = [];

        // 2. Deteksi Mode: Apakah Admin ingin override atau pakai default?
        // Frontend akan mengirim shift_id berupa string: "" (default), "off" (libur), atau angka "1", "2"
        let isOverride = false;
        let targetShiftId = null;

        if (shift_id !== undefined && shift_id !== "") {
            isOverride = true;
            if (shift_id === "off") {
                targetShiftId = null; // Memaksa menjadi hari libur
            } else {
                targetShiftId = parseInt(shift_id); // Memaksa menjadi shift spesifik
            }
        }

        // 3. Looping Pembuatan Data Matrix
        for (const pegawai of listPegawai) {
            // Tentukan shift_id akhir untuk pegawai ini
            const finalShiftId = isOverride ? targetShiftId : pegawai.default_shift_id;

            // Looping tanggal
            let current = new Date(start);
            while (current <= end) {
                const formatTanggal = current.toLocaleDateString('en-CA'); // YYYY-MM-DD
                
                listJadwalBaru.push({
                    pegawai_id: pegawai.id,
                    tanggal: formatTanggal,
                    shift_id: finalShiftId // Terapkan shift yang sudah ditentukan
                });
                
                current.setDate(current.getDate() + 1);
            }
        }

        // 4. Eksekusi Tembakan ke Database (Upsert: Timpa jika sudah ada)
        if (listJadwalBaru.length > 0) {
            const { error } = await supabase
                .from('jadwal_karyawan')
                .upsert(listJadwalBaru, { onConflict: 'pegawai_id,tanggal' }); 

            if (error) throw error;
        }

        return res.status(200).json({ 
            success: true, 
            message: `Berhasil men-generate ${listJadwalBaru.length} slot jadwal harian.` 
        });
    } catch (error) {
        console.error('Error generateJadwalMassal:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal men-generate jadwal massal.' });
    }
};

// =========================================================================
// 4. UPDATE: Mengubah Shift Karyawan di Hari Tertentu
// =========================================================================
// Endpoint: PUT /api/v1/jadwal/:id
const updateJadwalKaryawan = async (req, res) => {
    try {
        const { id } = req.params;
        const { shift_id, tanggal } = req.body;

        const { data, error } = await supabase
            .from('jadwal_karyawan')
            .update({ shift_id, tanggal })
            .eq('id', id)
            .select();

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Jadwal berhasil diperbarui.', data });
    } catch (error) {
        console.error('Error updateJadwalKaryawan:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui jadwal.' });
    }
};

// =========================================================================
// 5. DELETE: Menghapus Slot Jadwal (Misal Karyawan Cuti / Libur Nasional)
// =========================================================================
// Endpoint: DELETE /api/v1/jadwal/:id
const deleteJadwalKaryawan = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('jadwal_karyawan')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Slot jadwal berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleteJadwalKaryawan:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal menghapus jadwal.' });
    }
};

// POST: Fitur Tukar Shift Dinamis (Endpoint: /api/v1/jadwal/tukar-shift)
const tukarShiftKaryawan = async (req, res) => {
    try {
        const { 
            pegawai_id_asal, 
            tanggal_asal, 
            pegawai_id_tujuan, 
            tanggal_tujuan 
        } = req.body;

        // Ambil ID admin dari middleware otentikasi (contoh: req.user)
        const admin_id = req.user?.id || 'admin_system'; 

        // 1. Validasi Input Dasar
        if (!pegawai_id_asal || !tanggal_asal || !pegawai_id_tujuan || !tanggal_tujuan) {
            return res.status(400).json({ success: false, message: 'Parameter pertukaran tidak lengkap.' });
        }

        if (pegawai_id_asal === pegawai_id_tujuan && tanggal_asal === tanggal_tujuan) {
            return res.status(400).json({ success: false, message: 'Tidak dapat menukar dengan jadwal di hari yang sama.' });
        }

        // 2. Tarik Data Jadwal dan Role Pegawai Secara Paralel
        const [jadwalAsalRes, jadwalTujuanRes, pegawaiAsalRes, pegawaiTujuanRes] = await Promise.all([
            supabase.from('jadwal_karyawan').select('id, shift_id').eq('pegawai_id', pegawai_id_asal).eq('tanggal', tanggal_asal).maybeSingle(),
            supabase.from('jadwal_karyawan').select('id, shift_id').eq('pegawai_id', pegawai_id_tujuan).eq('tanggal', tanggal_tujuan).maybeSingle(),
            supabase.from('pegawai').select('role_id').eq('id', pegawai_id_asal).single(),
            supabase.from('pegawai').select('role_id').eq('id', pegawai_id_tujuan).single()
        ]);

        const jadwalAsal = jadwalAsalRes.data;
        const jadwalTujuan = jadwalTujuanRes.data;

        // Cegah eksekusi jika keduanya libur
        if (!jadwalAsal && !jadwalTujuan) {
            return res.status(400).json({ success: false, message: 'Kedua pegawai sedang libur pada tanggal tersebut.' });
        }

        // 3. Validasi Posisi (Role)
        // Memastikan Kasir hanya bertukar dengan Kasir, dsb.
        if (pegawaiAsalRes.data?.role_id !== pegawaiTujuanRes.data?.role_id) {
            return res.status(403).json({ success: false, message: 'Pertukaran ditolak: Role/Posisi kedua pegawai tidak setara.' });
        }

        // 4. Validasi Aturan Jam Kerja (Contoh Kerangka Logika)
        // Jika keduanya punya shift, pastikan jadwal baru tidak melanggar waktu istirahat minimal.
        // Asumsi: Kamu mengambil jam_mulai dan jam_selesai dari tabel 'shift'.
        if (jadwalAsal && jadwalTujuan) {
            /* [IMPLEMENTASI REAL-CASE]:
            1. Query shift hari sebelumnya untuk pegawai_id_asal.
            2. Cek selisih waktu antara jam_selesai hari sebelumnya dengan jam_mulai shift_tujuan.
            3. Jika selisih < 8 jam, return error (contoh: "Pelanggaran jam istirahat").
            */
        }

        // 5. Susun Operasi Database (Penanganan Nilai Null / Libur)
        // Kita gunakan pendekatan UPSERT jika ada shift, dan DELETE jika jadi libur.
        const operasiDatabase = [];

        // Logika untuk Pegawai Asal
        if (jadwalTujuan) {
            operasiDatabase.push(supabase.from('jadwal_karyawan').upsert({
                pegawai_id: pegawai_id_asal,
                tanggal: tanggal_asal,
                shift_id: jadwalTujuan.shift_id
            }, { onConflict: 'pegawai_id,tanggal' }));
        } else if (jadwalAsal) {
            // Jika Tujuan libur, maka Asal menjadi libur (hapus jadwal)
            operasiDatabase.push(supabase.from('jadwal_karyawan').delete().eq('id', jadwalAsal.id));
        }

        // Logika untuk Pegawai Tujuan
        if (jadwalAsal) {
            operasiDatabase.push(supabase.from('jadwal_karyawan').upsert({
                pegawai_id: pegawai_id_tujuan,
                tanggal: tanggal_tujuan,
                shift_id: jadwalAsal.shift_id
            }, { onConflict: 'pegawai_id,tanggal' }));
        } else if (jadwalTujuan) {
            // Jika Asal libur, maka Tujuan menjadi libur (hapus jadwal)
            operasiDatabase.push(supabase.from('jadwal_karyawan').delete().eq('id', jadwalTujuan.id));
        }

        // 6. Eksekusi Tukar Shift Secara Atomik di App Level
        const results = await Promise.all(operasiDatabase);
        const errors = results.filter(res => res.error);
        if (errors.length > 0) {
            console.error('DB Operation Errors:', errors);
            throw new Error('Gagal memperbarui jadwal di database.');
        }

        // 7. Pencatatan Jejak Audit (Audit Trail)
        // Berjalan asinkron di background agar tidak menahan response API
        const deskripsiLog = `Admin menukar shift ${pegawai_id_asal} (${tanggal_asal}) dengan ${pegawai_id_tujuan} (${tanggal_tujuan})`;
        supabase.from('log_aktivitas_admin').insert({
            admin_id: admin_id,
            aksi: 'TUKAR_SHIFT',
            deskripsi: deskripsiLog
        }).then(({ error }) => {
            if (error) console.error('Gagal mencatat log audit:', error.message);
        });

        // 8. Trigger Webhook untuk Broadcast WAHA via n8n
        // Berjalan asinkron di background
        fetch('https://n8n-url-kamu.com/webhook/notif-tukar-shift', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pegawai_asal: pegawai_id_asal,
                tanggal_asal: tanggal_asal,
                shift_baru_asal: jadwalTujuan ? jadwalTujuan.shift_id : 'LIBUR',
                pegawai_tujuan: pegawai_id_tujuan,
                tanggal_tujuan: tanggal_tujuan,
                shift_baru_tujuan: jadwalAsal ? jadwalAsal.shift_id : 'LIBUR'
            })
        }).catch(err => console.error('Gagal trigger webhook n8n:', err.message));

        return res.status(200).json({ 
            success: true, 
            message: '✅ Pertukaran shift berhasil diproses dan notifikasi sedang dikirim.' 
        });

    } catch (error) {
        console.error('Error Tukar Shift:', error.message);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat memproses tukar shift.' });
    }
};

// =========================================================================
// 1. GENERATE HARIAN (Manual Override / Dipanggil Saat Tukar Shift)
// =========================================================================
// Endpoint: POST /api/v1/jadwal/harian
// POST: Generate / Update Jadwal Harian
const generateJadwalHarian = async (req, res) => {
    try {
        const { pegawai_id, tanggal, shift_id } = req.body;

        if (!pegawai_id || !tanggal) {
            return res.status(400).json({ success: false, message: 'Pegawai ID dan Tanggal wajib diisi.' });
        }

        let dbData = null;
        let dbError = null;

        // Logika Percabangan Berdasarkan Nilai shift_id
        if (shift_id) {
            // Skenario 1: Ada shift_id -> Lakukan UPSERT (Insert/Update)
            const { data, error } = await supabase
                .from('jadwal_karyawan')
                .upsert({
                    pegawai_id,
                    tanggal,
                    shift_id
                }, { onConflict: 'pegawai_id,tanggal' })
                .select();

            dbData = data;
            dbError = error;
        } else {
            // Skenario 2: shift_id null/kosong (Off/Libur) -> Lakukan DELETE
            const { data, error } = await supabase
                .from('jadwal_karyawan')
                .delete()
                .eq('pegawai_id', pegawai_id)
                .eq('tanggal', tanggal)
                .select(); // Tambahkan select() jika ingin melihat data yang baru saja terhapus

            dbData = data;
            dbError = error;
        }

        if (dbError) throw dbError;

        // Sesuaikan pesan respons agar informatif bagi Frontend
        const keteranganStatus = shift_id ? 'diperbarui' : 'diliburkan';

        return res.status(200).json({ 
            success: true, 
            message: `Jadwal harian tanggal ${tanggal} berhasil ${keteranganStatus}.`,
            data: dbData 
        });

    } catch (error) {
        console.error('Error generateJadwalHarian:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memproses jadwal harian.' });
    }
};

// =========================================================================
// 2. LOGIKA GENERATE MINGGUAN AUTOMATION (Untuk dipanggil oleh Cron Job)
// =========================================================================
// Fungsi ini akan membuatkan jadwal otomatis dari hari SENIN s/d MINGGU depan
const prosesGenerateJadwalMingguanOtomatis = async () => {
    console.log('⏳ [CRON] Menjalankan Auto-Generate Jadwal Kerja Minggu Depan...');
    
    try {
        // A. Hitung rentang tanggal untuk MINGGU DEPAN (Senin s/d Minggu)
        // Jika sekarang Sabtu (hari eksekusi Cron), maka Senin depan adalah +2 hari, Minggu depan adalah +8 hari
        const hariIni = new Date();
        
        const seninDepan = new Date(hariIni);
        seninDepan.setDate(hariIni.getDate() + 2);
        
        const mingguDepan = new Date(hariIni);
        mingguDepan.setDate(hariIni.getDate() + 8);

        const startDateStr = seninDepan.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const endDateStr = mingguDepan.toLocaleDateString('en-CA');

        // B. Ambil seluruh pegawai aktif beserta Shift Default mereka
        const { data: listPegawai, error: errPegawai } = await supabase
            .from('pegawai')
            .select('id, nama, default_shift_id');

        if (errPegawai) throw errPegawai;
        if (!listPegawai || listPegawai.length === 0) return;

        const listJadwalOtomatis = [];

        // C. Looping menyusun jadwal 7 hari ke depan untuk semua orang
        for (const pegawai of listPegawai) {
            // Jika pegawai tidak punya shift default, kita lewati (dianggap libur/tidak terjadwal)
            if (!pegawai.default_shift_id) continue; 

            let current = new Date(seninDepan);
            const end = new Date(mingguDepan);

            while (current <= end) {
                listJadwalOtomatis.push({
                    pegawai_id: pegawai.id,
                    tanggal: current.toLocaleDateString('en-CA'),
                    shift_id: pegawai.default_shift_id
                });
                current.setDate(current.getDate() + 1);
            }
        }

        // D. Tembakkan Bulk Upsert ke Supabase
        if (listJadwalOtomatis.length > 0) {
            const { error: errUpsert } = await supabase
                .from('jadwal_karyawan')
                .upsert(listJadwalOtomatis, { onConflict: 'pegawai_id,tanggal' });

            if (errUpsert) throw errUpsert;
            console.log(`🎉 [CRON] Sukses men-generate ${listJadwalOtomatis.length} slot jadwal baru untuk periode ${startDateStr} s/d ${endDateStr}`);
        }

    } catch (error) {
        console.error('❌ [CRON] Gagal men-generate jadwal mingguan:', error.message);
        throw error; // Lempar ke master agar tercatat di log server
    }
};



module.exports = {
    getAllJadwal,
    createJadwalSatuan,
    generateJadwalMassal,
    updateJadwalKaryawan,
    deleteJadwalKaryawan,
    tukarShiftKaryawan,
    generateJadwalHarian,
    prosesGenerateJadwalMingguanOtomatis
};
