// File: src/controllers/admsController.js

const { parseAdmsLog } = require('../utils/admsParser');
const { prosesLogMesin } = require('../services/absensiService');
const { getOffsetMesinInternal } = require('./master/pengaturanController');
const supabase = require('../config/supabaseClient');

// 1. Handshake awal dari mesin ADMS (GET /iclock/cdata)
const handshake = (req, res) => {
    // WAJIB: Header Content-Type harus text/plain
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('OK\n');
};

// 2. Polling perintah dari mesin ADMS (GET /iclock/getrequest & POST /iclock/devicecmd)
const getDeviceCmd = (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('OK\n');
};

// 3. Penerimaan log absensi dari mesin ADMS (POST /iclock/cdata)
const receiveData = async (req, res) => {
    // PENTING: Set header text/plain segera di awal
    res.setHeader('Content-Type', 'text/plain');

    try {
        // Penanganan input yang aman (string / buffer / object)
        let rawLogData = req.body;
        if (typeof rawLogData !== 'string') {
            if (Buffer.isBuffer(rawLogData)) {
                rawLogData = rawLogData.toString('utf-8');
            } else if (typeof rawLogData === 'object' && rawLogData !== null) {
                rawLogData = Object.keys(rawLogData).join('\n');
            } else {
                rawLogData = String(rawLogData || '');
            }
        }

        // 1. Pecah teks mentah menjadi array object log
        const logs = parseAdmsLog(rawLogData);

        if (logs.length === 0) {
            // Jika tidak ada data log yang valid, tetap balas OK ke mesin
            return res.status(200).send('OK\n');
        }

        // 2. OPTIMASI SPEED: Bulk insert seluruh log mentah dalam 1 kali query ke Supabase
        const rawInserts = logs.map(log => ({
            pin_mesin_mentah: log.pinMesin,
            waktu_scan: `${log.tanggal} ${log.jam}`,
            punch_state: log.state
        }));

        const { error: bulkErr } = await supabase
            .from('log_mesin_absensi')
            .insert(rawInserts);

        if (bulkErr) {
            console.error('[ADMS BULK LOG ERROR]', bulkErr.message);
        }

        // 3. Ambil offset waktu mesin 1 KALI SAJA untuk digunakan semua log
        const offsetMenit = await getOffsetMesinInternal();

        // 4. Proses logika bisnis absensi secara PARALEL agar tidak timeout
        // (skipRawInsert = true karena sudah di-insert secara bulk di atas)
        await Promise.allSettled(logs.map(log => prosesLogMesin(log, true, offsetMenit)));

        // 5. Kembalikan balasan OK dengan format persis "OK\n" dan Content-Type text/plain
        return res.status(200).send('OK\n');

    } catch (error) {
        console.error('Error saat memproses ADMS POST:', error);
        // Tetap balas OK dengan header text/plain agar mesin tidak stuck dalam loop
        return res.status(200).send('OK\n');
    }
};

module.exports = { handshake, getDeviceCmd, receiveData };