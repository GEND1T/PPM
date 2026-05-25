import { ArrowLeft } from "lucide-react";
import Button from "../../../components/ui/Button";
import { useParams, useNavigate } from 'react-router-dom';

export default function DetailKaryawan(){
    const { id } = useParams();
    const navigate = useNavigate();
   // 1. Data utama (Nanti dari Backend/Zustand)
   const databaseKaryawan = [
        {
            id_url: "0001", // Ini ID yang dilempar dari tabel
            nama: "Karyawan A",
            id: "PRD-0001", // Ini ID Karyawan untuk ditampilkan
            nik: "12391829381928398",
            noHp: "0897654324",
            email: "Ambalala@gmail.com",
            departemen: "Administrasi",
            jabatan: "Admin 1",
            shift: "Shift 1 (05:00 - 13:00)",
            tanggalMasuk: "15 Januari 2023",
            alamat: "Jl. Anggrek 3 No. 40, Kel. Harmoni, Kec. Gambir, Jakarta" 
        },
        {
            id_url: "0002",
            nama: "Karyawan B",
            id: "PRD-0002",
            nik: "33281920391820003",
            noHp: "081234567890",
            email: "karyawan.b@gmail.com",
            departemen: "Administrasi",
            jabatan: "Admin 2",
            shift: "Shift 2 (13:00 - 21:00)",
            tanggalMasuk: "10 Februari 2024",
            alamat: "Jl. Melati No. 12, Tegal" 
        }
    ];

    // Cari data karyawan yang id_url-nya sama dengan id dari useParams
    const karyawan = databaseKaryawan.find((data) => data.id_url === id);

    // pengaman jika datanya tidak ditemukan (misal user ngetik URL ngawur)
    if (!karyawan) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-red-600 mb-4">Data Karyawan Tidak Ditemukan!</h2>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-md">Kembali</button>
            </div>
        );
    }

    const infoKaryawan = [
        { label: "ID", value: karyawan.id },
        { label: "NIK", value: karyawan.nik },
        { label: "No Hp", value: karyawan.noHp },
        { label: "Email", value: karyawan.email },
        { label: "Departemen", value: karyawan.departemen },
        { label: "Jabatan", value: karyawan.jabatan },
        { label: "Shift", value: karyawan.shift },
        { label: "Tanggal Masuk", value: karyawan.tanggalMasuk },
        { label: "Alamat", value: karyawan.alamat },
    ];

    const InfoRow = ({ label, value }: { label: string, value: string }) => (
        <div className="flex items-start text-[15px]">
            <span className="w-32 text-gray-500 font-medium shrink-0">{label}</span>
            <span className="mr-4 text-gray-500 shrink-0">:</span>
            <span className="text-gray-800 font-medium">{value}</span>
        </div>
    );

    return(
        <div className="p-6 max-w-2xlmx-auto">
             <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                
                <div className="flex grid-cols-1 md:grid-cols-2 justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">
                        Detail Karyawan
                    </h2>
                    <Button
                        variant="back"
                        icon={<ArrowLeft size={24} />}
                        onClick={() => navigate(-1)}
                        label="Kembali" 
                    />
                </div>
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-black inline-block  border-l-4 border-red-600 pl-2">
                        {karyawan.nama}
                    </h3>
                </div>
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 -translate-x-1/2"></div>
                    {infoKaryawan.map((item, index) => (
                        <InfoRow
                        key={index}
                        label={item.label}
                        value={item.value} />

                    ))}
                </div>

             </div>
        </div>
    );
}