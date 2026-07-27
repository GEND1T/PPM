// File: src/utils/admsParser.js

function parseAdmsLog(rawText) {
    // Pisahkan teks berdasarkan baris baru (enter)
    const lines = rawText.trim().split('\n');
    const parsedData = [];

    for (let line of lines) {
        // Abaikan baris kosong
        if (!line.trim()) continue;

        // Pisahkan teks berdasarkan spasi atau tab
        const parts = line.trim().split(/\s+/);
        
        // Asumsi format mesin Solution: PIN_MESIN TANGGAL JAM STATE VERIFICATION
        // Contoh: "101 2026-04-11 05:05:00 0 1"
        if (parts.length >= 3) {
            parsedData.push({
                pinMesin: parts[0],
                tanggal: parts[1], // "2026-04-11"
                jam: parts[2],     // "05:05:00"
                state: parts[3] || '0'
            });
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