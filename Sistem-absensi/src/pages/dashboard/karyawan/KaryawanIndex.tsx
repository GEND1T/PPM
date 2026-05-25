import { useNavigate } from "react-router-dom";
import TabelKaryawan from "../../../components/ui/tabel/tabelKaryawan/TabelKaryawan";
import Button from "../../../components/ui/Button";


const employeeDummy = [
    { id: "0001", nama: "Karyawan A", departemen: "Administrasi", jabatan: "Admin 1", shift: "shift 1", masakerja: "1 Tahun", status_lembur: "" },
    { id: "0002", nama: "Karyawan B", departemen: "Administrasi", jabatan: "Admin 2", shift: "shift 2", masakerja: "1 Tahun", status_lembur: "" },
    { id: "0003", nama: "Karyawan C", departemen: "Produksi", jabatan: "Oven", shift: "shift 1", masakerja: "1 Tahun", status_lembur: "" },
    { id: "0004", nama: "Karyawan D", departemen: "Produksi", jabatan: "Helper oven 1", shift: "shift 2", masakerja: "1 Tahun", status_lembur: "" },
];

export default function KaryawanIndex() {
    const navigate = useNavigate();

    // Menghitung jumlah karyawan dari data (nantinya ini dari backend)
    const totalKaryawan = employeeDummy.length;

    return (
        <div className="flex flex-col gap-6 w-full">
            
            {/* 1. BAGIAN STATISTIK (Meniru desain kotak di gambarmu) */}
            <div className="flex gap-4">
                <div className="bg-white border border-gray-300 rounded-xl p-4 w-48 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-gray-800 text-sm md:text-base font-medium">Total Karyawan</span>
                    <span className="text-4xl font-bold mt-2 text-black">{totalKaryawan}</span>
                </div>
            </div>

            {/* 2. BAGIAN TABEL DAN TOMBOL */}
            <section className="bg-white border border-gray-300 rounded-2xl p-4 shadow-sm w-full">
                
                {/* Header Tabel & Kumpulan Tombol */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-6 gap-4">
                    <h2 className="text-lg font-bold text-black border-l-4 border-red-600 pl-2 mt-1">
                        Data Karyawan Aktif
                    </h2>
                    
                    <div className="flex flex-col gap-3">
                        <Button 
                            variant="add" 
                            label="Tambah Karyawan" 
                            onClick={() => navigate("/dashboard/data-karyawan/tambah-karyawan")} 
                        />
                    </div>
                </div>
                
                {/* 3. PEMANGGILAN KOMPONEN TABEL */}
                <TabelKaryawan data={employeeDummy} />
                
            </section>
        </div>
    );
}