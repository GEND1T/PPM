
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users } from 'lucide-react';
import Button from '../../../components/ui/Button';
import TabelDetailDepartemen from '../../../components/ui/tabel/tabelDepartemen/TabelDetailDepartemen';

// --- DATA DUMMY (Sama seperti di index, nanti diganti API) ---
const dummyDepartemen = [
    {
        id: "dept-1",
        nama: "Administrasi",
        total_karyawan: 3, // Ubah jadi total_karyawan agar tampil di kartu atas
        jabatan: [
            // Tambahkan id dan jumlah_karyawan di sini
            { id: 1, jabatan: "Admin", jumlah_karyawan: 5 }, 
            { id: 2, jabatan: "Satpam", jumlah_karyawan: 2 },
            { id: 3, jabatan: "Call Center", jumlah_karyawan: 3 },
        ]
    },
    {
        id: "dept-2",
        nama: "Produksi",
        total_karyawan: 20,
        jabatan: [
            { id: 4, jabatan: "Molder 1", jumlah_karyawan: 15 },
            { id: 5, jabatan: "Helper", jumlah_karyawan: 5 },
        ]
    },
    {
        id: "dept-3",
        nama: "Maintenance",
        total_karyawan: 2,
        jabatan: [
            { id: 6, jabatan: "Teknisi Mesin", jumlah_karyawan: 1 },
            { id: 7, jabatan: "Teknisi Listrik", jumlah_karyawan: 1 },
        ]
    }
];

export default function DetailDepartemen() {
    const { id } = useParams(); // Mengambil ID dari URL
    const navigate = useNavigate();

    // Mencari data departemen yang diklik berdasarkan ID
    const departemen = dummyDepartemen.find(dept => dept.id === id);

    // Jika ID tidak ditemukan (URL ngawur)
    if (!departemen) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-xl font-bold text-gray-500">Departemen tidak ditemukan!</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-red-600 text-white rounded-md">Kembali</button>
            </div>
        );
    }


    return (
        <div className="flex flex-col gap-6 w-full">
            

            {/* 2. KARTU INFORMASI DEPARTEMEN */}
            <div className="bg-white border border-gray-300 rounded-xl p-5 shadow-sm flex items-center gap-6">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-lg flex items-center justify-center border border-red-100">
                    <Building2 size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-extrabold text-gray-800">{departemen.nama}</h3>
                    <div className="flex items-center gap-2 text-gray-500 mt-1">
                        <Users size={16} />
                        <span className="font-medium">Total jabatan: </span>
                        <span className="font-bold text-black">{departemen.total_karyawan} Jabatan</span>
                    </div>
                </div>
            </div>

            {/* 3. TABEL DAFTAR KARYAWAN */}
            <div className="bg-white border border-gray-300 rounded-xl p-5 shadow-sm">
                <div className='flex grid-cols-1 md:grid-cols-2 justify-between'>
                    <h4 className="text-md font-bold text-gray-700 mb-4">Daftar Jabatan di Dept. {departemen.nama}</h4>
                    <Button
                        variant="back"
                        icon={<ArrowLeft size={24} />}
                        onClick={() => navigate(-1)}
                        label="Kembali"
                        className='mb-4'
                    />
                </div>
                <TabelDetailDepartemen data={departemen.jabatan} />  
            </div>

        </div>
    );
}