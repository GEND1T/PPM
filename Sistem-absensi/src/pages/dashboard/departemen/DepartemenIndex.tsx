import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button";
import TabelDepartemen from "../../../components/ui/tabel/tabelDepartemen/TabelDepartemen";



export default function DepartemenIndex() {
    const navigate = useNavigate();



    const dummyDepartemen = [
        {
            id: "dept-1",
            nama: "Administrasi",
            total_karyawan: 3,
            karyawan: [
                { id: "k-1", nama: "Nadine", jabatan: "Admin 1", shift: "1" },
                { id: "k-2", nama: "Abigail", jabatan: "Admin 2", shift: "2" },
                { id: "k-3", nama: "Vivian", jabatan: "Admin 3", shift: "1" },
            ]
        },
        {
            id: "dept-2",
            nama: "Produksi",
            total_karyawan: 20,
            karyawan: [
                { id: "k-4", nama: "Budi Santoso", jabatan: "Molder 1", shift: "1" },
                { id: "k-5", nama: "Siti Aminah", jabatan: "Packer 1", shift: "2" },
                { id: "k-6", nama: "Joko Widodo", jabatan: "Helper", shift: "1" },
            ]
        },
        {
            id: "dept-3",
            nama: "Maintenance",
            total_karyawan: 2,
            karyawan: [
                { id: "k-7", nama: "Agus Teknisi", jabatan: "Teknisi Mesin", shift: "1" },
                { id: "k-8", nama: "Hendra Listrik", jabatan: "Teknisi Listrik", shift: "2" },
            ]
        }
    ];
    const dataUntukTabel = dummyDepartemen.map((dept) => {
        // Ambil semua nama jabatan dari array karyawan
        const semuaJabatan = dept.karyawan.map(k => k.jabatan);
        // Gunakan Set() untuk menyaring jabatan yang kembar (mengambil yang unik saja)
        const jabatanUnik = new Set(semuaJabatan); 

        return {
            ...dept, // Bawa data aslinya (id, nama, total_karyawan)
            jumlah_jabatan: jabatanUnik.size // Tambahkan data baru: jumlah jabatan unik
        };
    });

    // Menghitung jumlah karyawan dari data (nantinya ini dari backend)
    const totalDepartemen = dummyDepartemen.length;

    return (
        <div className="flex flex-col gap-6 w-full">

            {/* 1. BAGIAN STATISTIK (Meniru desain kotak di gambarmu) */}
            <div className="flex gap-4">
                <div className="bg-white border border-gray-300 rounded-xl p-4 w-48 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-gray-800 text-sm md:text-base font-medium">Total Departemen</span>
                    <span className="text-4xl font-bold mt-2 text-black">{totalDepartemen}</span>
                </div>
            </div>

            {/* 2. BAGIAN TABEL DAN TOMBOL */}
            <section className="bg-white border border-gray-300 rounded-2xl p-4 shadow-sm w-full">

                {/* Header Tabel & Kumpulan Tombol */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-6 gap-4">
                    <h2 className="text-lg font-bold text-black border-l-4 border-red-600 pl-2 mt-1">
                        Data Departemen
                    </h2>

                    <div className="flex flex-col gap-3">
                        <Button
                            variant="add"
                            label="Tambah Departemen    "
                            onClick={() => navigate("/dashboard/departemen/tambah-departemen")}
                        />
                    </div>
                </div>

                {/* 3. PEMANGGILAN KOMPONEN TABEL */}
                <TabelDepartemen data={dataUntukTabel} />

            </section>
        </div>
    );
}