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


module.exports = { getAllAbsen, updateAbsen, createAbsenManual };