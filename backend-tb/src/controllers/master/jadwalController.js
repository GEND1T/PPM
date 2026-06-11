
const supabase = require('../../config/supabaseClient');

// =========================================================================
// 1. READ: Ambil Semua Jadwal (Dengan Filter Bulan, Tahun, atau Pegawai)
// =========================================================================
// Endpoint: GET /api/v1/jadwal?bulan=06&tahun=2026&pegawai_id=5
const getAllJadwal = async (req, res) => {
    try {
        const { bulan, tahun, pegawai_id } = req.query;

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

        // Filter dinamis jika parameter dikirim dari frontend
        if (pegawai_id) {
            query = query.eq('pegawai_id', pegawai_id);
        }

        if (bulan && tahun) {
            const awalBulan = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
            const totalHari = new Date(tahun, bulan, 0).getDate();
            const akhirBulan = `${tahun}-${String(bulan).padStart(2, '0')}-${String(totalHari).padStart(2, '0')}`;
            
            query = query.gte('tanggal', awalBulan).lte('tanggal', akhirBulan);
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

        // 1. Validasi Input
        if (!pegawai_id_asal || !tanggal_asal || !pegawai_id_tujuan || !tanggal_tujuan) {
            return res.status(400).json({ success: false, message: 'Parameter pertukaran tidak lengkap.' });
        }

        // 2. Ambil jadwal existing (Bisa jadi null jika jadwal belum di-generate / sedang Libur)
        const { data: jadwalAsal } = await supabase
            .from('jadwal_karyawan')
            .select('shift_id')
            .eq('pegawai_id', pegawai_id_asal)
            .eq('tanggal', tanggal_asal)
            .maybeSingle();

        const { data: jadwalTujuan } = await supabase
            .from('jadwal_karyawan')
            .select('shift_id')
            .eq('pegawai_id', pegawai_id_tujuan)
            .eq('tanggal', tanggal_tujuan)
            .maybeSingle();

        // Ambil ID shift-nya. Jika datanya tidak ada, asumsikan null (Libur)
        const shiftAsal = jadwalAsal ? jadwalAsal.shift_id : null;
        const shiftTujuan = jadwalTujuan ? jadwalTujuan.shift_id : null;

        // Cegah eksekusi jika keduanya sama-sama libur (tidak ada yang bisa ditukar)
        if (!jadwalAsal && !jadwalTujuan) {
            return res.status(400).json({ success: false, message: 'Kedua pegawai sedang libur pada tanggal tersebut.' });
        }

        // 3. Rakit Array Payload Pertukaran (Timbal-Balik)
        const payloadTukar = [
            {
                pegawai_id: pegawai_id_asal,
                tanggal: tanggal_asal, // Tanggal milik Asal tetap
                shift_id: shiftTujuan  // Tapi shift-nya mengambil milik Tujuan
            },
            {
                pegawai_id: pegawai_id_tujuan,
                tanggal: tanggal_tujuan, // Tanggal milik Tujuan tetap
                shift_id: shiftAsal      // Tapi shift-nya mengambil milik Asal
            }
        ];

        // 4. Eksekusi 1x Request Menggunakan UPSERT
        // onConflict memastikan: Jika baris belum ada (awalnya libur), buat baru (Insert). 
        // Jika sudah ada, langsung timpa shift-nya (Update).
        const { error: errUpsert } = await supabase
            .from('jadwal_karyawan')
            .upsert(payloadTukar, { onConflict: 'pegawai_id,tanggal' });

        if (errUpsert) throw errUpsert;

        return res.status(200).json({ 
            success: true, 
            message: '🚀 Pertukaran shift lintas hari berhasil diproses secara realtime!' 
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
const generateJadwalHarian = async (req, res) => {
    try {
        const { pegawai_id, tanggal, shift_id } = req.body;

        if (!pegawai_id || !tanggal) {
            return res.status(400).json({ success: false, message: 'Pegawai ID dan Tanggal wajib diisi.' });
        }

        // Menggunakan upsert: Jika jadwal pegawai di tanggal itu sudah ada, update shift_id nya.
        // Jika belum ada (misal hari libur/kosong), sistem akan membuat baris baru.
        // Note: shift_id bisa dikirim null jika ingin mengubah hari itu menjadi LIBUR (Day Off)
        const { data, error } = await supabase
            .from('jadwal_karyawan')
            .upsert({
                pegawai_id,
                tanggal,
                shift_id: shift_id || null 
            }, { onConflict: 'pegawai_id,tanggal' })
            .select();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: `Jadwal harian tanggal ${tanggal} berhasil diperbarui secara realtime.`,
            data 
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
