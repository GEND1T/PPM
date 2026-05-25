import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Users, Loader2 } from "lucide-react"; 
import Button from "../../../components/ui/Button";
import TabelJabatan from "../../../components/ui/tabel/tabelJabatan/TabelJabatan";

// 1. Buat Interface untuk struktur data tabelmu
interface JabatanData {
    id: string | number;
    nama_jabatan: string;
    departemen: string;
    jumlah_karyawan: number;
}

export default function JabatanIndex() {
    const navigate = useNavigate();

    // 2. State untuk menyimpan data dari Database & status Loading
    const [dataJabatan, setDataJabatan] = useState<JabatanData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 3. Fungsi FETCH dari Backend (READ)
    const fetchJabatan = async () => {
        setIsLoading(true);
        try {
            // Tembak API Backend
            const response = await fetch("http://localhost:3000/api/v1/jabatan", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem('token')}` // Gunakan ini nanti jika butuh login
                }
            });

            if (!response.ok) {
                throw new Error("Gagal memuat data dari server");
            }

            const result = await response.json();
            
            // 4. MAPPING DATA: Sesuaikan bentuk data backend ke bentuk dummy-mu sebelumnya
            const mappedData: JabatanData[] = result.data.map((item: any) => ({
                id: item.id,
                nama_jabatan: item.nama_jabatan,
                // Backend mengirim objek, kita ambil string namanya saja
                departemen: item.departemen?.nama_departemen || "Tanpa Departemen", 
                // Karena backend belum punya fitur hitung karyawan per jabatan, kita set 0 dulu
                jumlah_karyawan: 0 
            }));

            setDataJabatan(mappedData);

        } catch (error) {
            console.error("Error fetching jabatan:", error);
            alert("Gagal memuat data jabatan. Pastikan backend berjalan.");
        } finally {
            setIsLoading(false);
        }
    };

    // 5. Jalankan Fetch saat halaman dibuka
    useEffect(() => {
        fetchJabatan();
    }, []);

    // 6. Kalkulasi Statistik Otomatis berdasarkan data dari Database
    const totalJabatan = dataJabatan.length;
    const totalKaryawan = dataJabatan.reduce((acc, curr) => acc + curr.jumlah_karyawan, 0);

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
            <section className="bg-white border border-gray-300 rounded-2xl p-4 shadow-sm w-full min-h-100">
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

                {/* 3. PEMANGGILAN KOMPONEN TABEL */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Loader2 className="animate-spin mb-4 text-red-600" size={32} />
                        <p>Memuat data dari database...</p>
                    </div>
                ) : (
                    <TabelJabatan data={dataJabatan} />
                )}
            </section>
        </div>
    );
}