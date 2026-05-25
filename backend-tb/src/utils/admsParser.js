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

module.exports = { parseAdmsLog, timeToMinutes };