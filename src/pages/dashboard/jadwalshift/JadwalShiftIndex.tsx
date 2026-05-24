import { useNavigate } from "react-router-dom";
import Button from '../../../components/ui/Button';
import { TabelJadwalShift, type ShiftData,  } from '../../../components/ui/tabel/tabelJadwalShif/TabelJadwalShif';

export default function JadwalShiftIndex() {
    const navigate = useNavigate();

    // Data dummy sesuai dengan interface ShiftData yang baru
    const jadwalData: ShiftData[] = [
        {
            id: 1,
            kode_shift: "SHIFT_PAGI",
            jam_masuk: "07:00",
            jam_pulang: "15:00",
            lintas_hari: false,
            is_potong_gaji_terlambat: true,
            denda_terlambat_per_menit: 1000
        },
        {
            id: 2,
            kode_shift: "SHIFT_MALAM",
            jam_masuk: "23:00",
            jam_pulang: "07:00",
            lintas_hari: true,
            is_potong_gaji_terlambat: true,
            denda_terlambat_per_menit: 1500
        },
        {
            id: 3,
            kode_shift: "NORMAL_DAY",
            jam_masuk: "08:00",
            jam_pulang: "16:00",
            lintas_hari: false,
            is_potong_gaji_terlambat: false,
            denda_terlambat_per_menit: 0
        }
    ];

    const handleEdit = (id: number | string) => {
        navigate(`/dashboard/jadwal-shift/edit/${id}`);
    };

    const handleDelete = (id: number | string) => {
        const confirmDelete = window.confirm("Yakin ingin menghapus shift ini?");
        if (confirmDelete) {
            console.log("Hapus shift dengan ID:", id);
            alert("Shift berhasil dihapus! (Simulasi)");
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full p-2">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Jadwal & Shift Kerja</h1>
                    <p className="text-sm text-gray-500 mt-1">Kelola master data jam kerja, toleransi, dan denda.</p>
                </div>
                <Button 
                    variant="add" 
                    label="Tambah Jadwal & Shift" 
                    onClick={() => navigate('/dashboard/jadwal-shift/tambah')} 
                />
            </div>

            {/* INFO BANNER */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 shadow-sm">
                <p className="text-sm text-yellow-700">
                    💡 <strong>Catatan:</strong> Perubahan aturan shift dan nominal denda akan otomatis berlaku pada kalkulasi absensi di hari berikutnya.
                </p>
            </div>

            {/* PEMANGGILAN KOMPONEN TABEL */}
            <TabelJadwalShift 
                data={jadwalData} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
            />
            
        </div>
    );
}