    
import Button from '../../../components/ui/Button';

import { TabelJadwalShift } from '../../../components/ui/tabel/tabelJadwalShif/TabelJadwalShif';

export default function JadwalShiftIndex() {
    const jadwalData = [
        {
            id: 1,
            divisi: "Produksi",
            nama_shift: "Shift 1 (Pagi)",
            jam_masuk: "07:00",
            jam_pulang: "15:00",
            keterangan: "Senin - Sabtu",
        },
        // ... data lainnya ...
    ];

    const handleEdit = (id: number | string) => {
        console.log("Edit shift dengan ID:", id);
        // Logika navigasi ke halaman edit bisa ditaruh di sini
    };

    return (
        <div className="flex flex-col gap-6 w-full p-2">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Jadwal & Shift Kerja</h1>
                </div>
                <Button variant="add" label="Tambah Jadwal & Shift" />
            </div>

            {/* Panggil komponen tabelnya di sini! */}
            <TabelJadwalShift data={jadwalData} onEdit={handleEdit} />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <p className="text-sm text-yellow-700 italic">
                    💡 Perubahan jadwal akan otomatis berlaku mulai hari berikutnya.
                </p>
            </div>
        </div>
    );
}