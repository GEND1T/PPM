import { useNavigate } from "react-router-dom";
import { Briefcase, Users } from "lucide-react"; // Icon baru untuk jabatan
import Button from "../../../components/ui/Button";
import TabelJabatan from "../../../components/ui/tabel/tabelJabatan/TabelJabatan";
// Import tabelmu nanti: import TabelJabatan from "../../../components/ui/tabel/TabelJabatan";

export default function JabatanIndex() {
    const navigate = useNavigate();

    // --- DATA DUMMY JABATAN ---
    const dummyJabatan = [
        { id: "jbt-1", nama_jabatan: "Admin 1", departemen: "Administrasi", jumlah_karyawan: 2 },
        { id: "jbt-2", nama_jabatan: "Satpam", departemen: "Administrasi", jumlah_karyawan: 4 },
        { id: "jbt-3", nama_jabatan: "Molder 1", departemen: "Produksi", jumlah_karyawan: 15 },
        { id: "jbt-4", nama_jabatan: "Helper", departemen: "Produksi", jumlah_karyawan: 5 },
        { id: "jbt-5", nama_jabatan: "Teknisi Mesin", departemen: "Maintenance", jumlah_karyawan: 1 },
    ];

    const totalJabatan = dummyJabatan.length;
    // Menghitung total semua karyawan dari semua jabatan
    const totalKaryawan = dummyJabatan.reduce((acc, curr) => acc + curr.jumlah_karyawan, 0);

    return (
        <div className="flex flex-col gap-6 w-full">

            {/* 1. BAGIAN STATISTIK */}
            <div className="flex flex-wrap gap-4">
                {/* Kotak 1: Total Jabatan */}
                <div className="bg-white border border-gray-300 rounded-xl p-4 min-w-48 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Jabatan</p>
                        <p className="text-2xl font-bold text-black">{totalJabatan}</p>
                    </div>
                </div>

                {/* Kotak 2: Total Karyawan Menjabat */}
                <div className="bg-white border border-gray-300 rounded-xl p-4 min-w-48 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Karyawan Terisi</p>
                        <p className="text-2xl font-bold text-black">{totalKaryawan}</p>
                    </div>
                </div>
            </div>

            {/* 2. BAGIAN TABEL DAN TOMBOL */}
            <section className="bg-white border border-gray-300 rounded-2xl p-4 shadow-sm w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-6 gap-4">
                    <h2 className="text-lg font-bold text-black border-l-4 border-red-600 pl-2 mt-1">
                        Data Jabatan
                    </h2>

                    <div className="flex flex-col gap-3">
                        <Button
                            variant="add"
                            label="Tambah Jabatan"
                            onClick={() => navigate("/dashboard/jabatan/tambah-jabatan")}
                        />
                    </div>
                </div>

                {/* 3. PEMANGGILAN KOMPONEN TABEL NANTI DI SINI */}
                {/* <TabelJabatan data={dummyJabatan} /> */}
               
                <TabelJabatan data={dummyJabatan}  />
                

            </section>
        </div>
    );
}