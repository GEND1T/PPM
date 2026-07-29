// File: src/utils/admsParser.js

function parseAdmsLog(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    // Pisahkan teks berdasarkan baris baru (support Windows \r\n & Unix \n)
    const lines = rawText.trim().split(/\r?\n/);
    const parsedData = [];

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Abaikan header tabel ADMS/ZK (contoh: "table=ATTLOG", "Stamp=123", dsb)
        if (trimmed.startsWith('table=') || trimmed.startsWith('Stamp=') || trimmed.startsWith('USER')) continue;

        // Pisahkan teks berdasarkan spasi atau tab
        const parts = trimmed.split(/\s+/);
        
        // Format mesin Solution: PIN_MESIN TANGGAL JAM STATE VERIFICATION
        // Contoh: "101 2026-04-11 05:05:00 0 1" atau "101\t2026-04-11 05:05:00\t0\t1"
        if (parts.length >= 3) {
            const tanggalStr = parts[1];
            const jamStr = parts[2];

            // Validasi format tanggal YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(tanggalStr)) {
                parsedData.push({
                    pinMesin: parts[0],
                    tanggal: tanggalStr, // "2026-04-11"
                    jam: jamStr,         // "05:05:00"
                    state: parts[3] || '0'
                });
            }
        }
    }
    return parsedData;
}

// Fungsi bantuan untuk mengubah jam string "HH:MM:SS" menjadi total menit
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
}

// Fungsi bantuan untuk menggeser tanggal & jam berdasarkan offset menit (+/-)
function adjustLogTime(tanggalStr, jamStr, offsetMenit) {
    if (!offsetMenit || isNaN(Number(offsetMenit))) {
        return { tanggal: tanggalStr, jam: jamStr };
    }
    const offset = Number(offsetMenit);
    if (offset === 0) return { tanggal: tanggalStr, jam: jamStr };

    const [year, month, day] = tanggalStr.split('-').map(Number);
    const [hours, minutes, seconds] = jamStr.split(':').map(Number);

    const dt = new Date(year, month - 1, day, hours, minutes, seconds || 0);
    dt.setMinutes(dt.getMinutes() + offset);

    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');

    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    const ss = String(dt.getSeconds()).padStart(2, '0');

    return {
        tanggal: `${y}-${m}-${d}`,
        jam: `${hh}:${mm}:${ss}`
    };
}

module.exports = { parseAdmsLog, timeToMinutes, adjustLogTime };