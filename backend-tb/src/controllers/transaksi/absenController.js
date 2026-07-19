const supabase = require('../../config/supabaseClient');
const { prosesLogMesin } = require('../../services/absensiService'); 

// 1. GET: Ambil semua data absensi (Bisa difilter per rentang tanggal nantinya)
const getAllAbsen = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('absensi')
            .select(`
                id, tanggal, waktu_awal, waktu_akhir, status, status_lembur,
                pegawai (id, nama, jabatan (nama_jabatan))
            `)
            .order('tanggal', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getAllAbsen:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data absensi' });
    }
};

// 2. PUT: Update Absensi (Dipanggil saat HRD klik "Save" di DataGrid Frontend)
const updateAbsen = async (req, res) => {
    try {
        const { id } = req.params; // ID absensi dari URL parameter
        const { status_masuk, status_lembur } = req.body; // Data yang dikirim dari React

        // Mapping kembali ke nilai database (misal: "Tepat" menjadi "intime", "Terlambat" menjadi "late")
        let statusDB = status_masuk;
        if (status_masuk === 'Tepat') statusDB = 'intime';
        else if (status_masuk === 'Terlambat') statusDB = 'late';
        else if (status_masuk === 'Void') statusDB = 'void';

        const { data, error } = await supabase
            .from('absensi')
            .update({ 
                status: statusDB, 
                status_lembur: status_lembur 
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: 'Data absensi berhasil diperbarui', 
            data 
        });
    } catch (error) {
        console.error('Error updateAbsen:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui data absensi' });
    }
};



// POST: Membuat absensi manual oleh Admin/HRD
const createAbsenManual = async (req, res) => {
    try {
        // Ambil data dari frontend
        const { pegawai_id, pin_mesin, jam_masuk, jam_pulang } = req.body;
        
        // ==========================================================
        // FITUR BARU: AUTO-DATE JIKA FRONTEND TIDAK MENGIRIM TANGGAL
        // ==========================================================
        let tanggal = req.body.tanggal;
        if (!tanggal || tanggal.trim() === "") {
            tanggal = new Date().toLocaleDateString('en-CA'); // Hasil: "2026-06-14" (Tergantung hari ini)
        }

        // Validasi input dasar (Hanya wajibkan pegawai_id dan pin_mesin)
        if (!pegawai_id || !pin_mesin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data pegawai_id dan pin_mesin wajib dikirim!' 
            });
        }

        let finalJamMasuk = jam_masuk;
        let finalJamPulang = jam_pulang;

        // 1. CEK KEKOSONGAN JAM & AMBIL DEFAULT DARI JADWAL JIKA PERLU
        if (!finalJamMasuk || finalJamMasuk.trim() === "" || !finalJamPulang || finalJamPulang.trim() === "") {
            
            // Tarik jadwal pada "tanggal" (bisa tanggal spesifik atau hari ini)
            const { data: jadwal, error: errJadwal } = await supabase
                .from('jadwal_karyawan')
                .select('shifts (jam_masuk, jam_pulang)')
                .eq('pegawai_id', pegawai_id)
                .eq('tanggal', tanggal)
                .maybeSingle();

            if (errJadwal) throw errJadwal;

            if (!jadwal || !jadwal.shifts) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Tidak dapat mengisi waktu otomatis karena pegawai tidak memiliki jadwal shift aktif pada tanggal ${tanggal}.` 
                });
            }

            // Timpa dengan waktu dari shift jika input dari frontend kosong
            if (!finalJamMasuk || finalJamMasuk.trim() === "") {
                finalJamMasuk = jadwal.shifts.jam_masuk;
            }
            if (!finalJamPulang || finalJamPulang.trim() === "") {
                finalJamPulang = jadwal.shifts.jam_pulang;
            }
        }

        // 2. RAKIT PAYLOAD SEPERTI LOG ADMS
        const logPayloads = [];

        // Payload Jam Masuk
        if (finalJamMasuk) {
            logPayloads.push({
                pinMesin: pin_mesin,
                tanggal: tanggal, // Pasti terisi
                jam: finalJamMasuk,
                state: 0 
            });
        }

        // Payload Jam Pulang
        if (finalJamPulang) {
            logPayloads.push({
                pinMesin: pin_mesin,
                tanggal: tanggal, // Pasti terisi
                jam: finalJamPulang,
                state: 1 
            });
        }

        // 3. EKSEKUSI KE ENGINE ABSENSI SECARA BERURUTAN
        let successCount = 0;
        for (const log of logPayloads) {
            await prosesLogMesin(log);
            successCount++;
        }

        return res.status(200).json({ 
            success: true, 
            message: `Berhasil memproses rekam jejak absensi manual untuk tanggal ${tanggal}.` 
        });

    } catch (error) {
        console.error('Error createAbsenManual:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan sistem saat memproses absensi manual.' 
        });
    }
};

// 4. POST: Simulasi Endpoint Kirim Log Mesin Absensi (Menguji integrasi mesin ADMS / Fingerprint)
const simulasiLogMesin = async (req, res) => {
    try {
        let logsToProcess = [];

        // 1. JIKA BODY ADALAH TEKS MENTAH (Format ADMS Mesin)
        if (typeof req.body === 'string' && req.body.trim()) {
            const { parseAdmsLog } = require('../../utils/admsParser');
            logsToProcess = parseAdmsLog(req.body);
        }
        // 2. JIKA BODY ADALAH OBJECT / JSON
        else if (typeof req.body === 'object' && req.body !== null) {
            const { mode, tanggal, logs, pin_mesin, jam, state } = req.body;

            // Mode 2A: Mode Auto-Generate Simulasi per Tanggal
            if (mode === 'auto') {
                const tglSimulasi = tanggal || new Date().toLocaleDateString('en-CA');
                
                const { data: listJadwal, error: errJadwal } = await supabase
                    .from('jadwal_karyawan')
                    .select('pegawai_id, pegawai (pin_mesin), shifts (jam_masuk, jam_pulang)')
                    .eq('tanggal', tglSimulasi);

                if (errJadwal) throw errJadwal;

                if (!listJadwal || listJadwal.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Tidak ada jadwal shift karyawan pada tanggal ${tglSimulasi}.`
                    });
                }

                for (const item of listJadwal) {
                    const pin = item.pegawai?.pin_mesin;
                    const shift = item.shifts;
                    if (pin && shift) {
                        // Log Scan Masuk
                        logsToProcess.push({
                            pinMesin: pin,
                            tanggal: tglSimulasi,
                            jam: shift.jam_masuk,
                            state: 0
                        });
                        // Log Scan Pulang
                        logsToProcess.push({
                            pinMesin: pin,
                            tanggal: tglSimulasi,
                            jam: shift.jam_pulang,
                            state: 1
                        });
                    }
                }
            }
            // Mode 2B: Multiple Logs JSON Array
            else if (Array.isArray(logs) && logs.length > 0) {
                logsToProcess = logs.map(l => ({
                    pinMesin: String(l.pin_mesin || l.pinMesin),
                    tanggal: l.tanggal,
                    jam: l.jam,
                    state: l.state !== undefined ? l.state : 0
                }));
            }
            // Mode 2C: Single Log JSON Object
            else if (pin_mesin || req.body.pinMesin) {
                const pin = pin_mesin || req.body.pinMesin;
                const tgl = tanggal || new Date().toLocaleDateString('en-CA');
                logsToProcess.push({
                    pinMesin: String(pin),
                    tanggal: tgl,
                    jam: jam || '08:00:00',
                    state: state !== undefined ? state : 0
                });
            }
        }

        if (logsToProcess.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Format request simulasi tidak valid atau data log kosong.',
                contoh_format: {
                    single_json: { pin_mesin: "101", tanggal: "2026-06-05", jam: "07:05:00", state: 0 },
                    batch_json: { logs: [{ pin_mesin: "101", tanggal: "2026-06-05", jam: "07:05:00", state: 0 }] },
                    auto_generate: { mode: "auto", tanggal: "2026-06-05" },
                    raw_adms_text: "101 2026-06-05 07:05:00 0 1"
                }
            });
        }

        // 3. EKSEKUSI PEMROSESAN LOG MELALUI SERVICE MESIN UTAMA
        let diproses = 0;
        const detailHasil = [];

        for (const log of logsToProcess) {
            await prosesLogMesin(log);
            diproses++;
            detailHasil.push({
                pin_mesin: log.pinMesin,
                waktu_scan: `${log.tanggal} ${log.jam}`,
                punch_state: log.state === 0 ? 'Masuk' : log.state === 1 ? 'Pulang' : log.state
            });
        }

        return res.status(200).json({
            success: true,
            message: `Simulasi mesin absensi berhasil! ${diproses} log data telah diproses oleh payroll engine.`,
            total_log: diproses,
            detail: detailHasil
        });

    } catch (error) {
        console.error('Error simulasiLogMesin:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan sistem saat memproses simulasi mesin absensi.',
            error: error.message
        });
    }
};

module.exports = { getAllAbsen, updateAbsen, createAbsenManual, simulasiLogMesin };