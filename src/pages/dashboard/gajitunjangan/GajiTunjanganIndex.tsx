import { useState } from 'react';
import { Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// IMPORT KOMPONEN TABEL YANG BARU DIBUAT (Sesuaikan nama foldernya jika perlu)

import { TabelMasterGaji, type MasterGajiData } from '../../../components/ui/tabel/tabelGaji/TabelMasterGaji';
import { TabelRekapGaji, type RekapGajiData } from '../../../components/ui/tabel/tabelGaji/TabelRekapGaji';

const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// Nama variabel diubah menjadi dummyRekapGaji
const dummyRekapGaji: RekapGajiData[] = [
    { id: 1, nama: "Adies", jabatan: "Admin 1", gaji_dasar: 3500000, total_bonus: 500000, total_potongan: 0, gaji_bersih: 4000000, status: "Dibayar" },
    { id: 2, nama: "Fitria", jabatan: "Molder 1", gaji_dasar: 3200000, total_bonus: 300000, total_potongan: 50000, gaji_bersih: 3450000, status: "Pending" },
    { id: 3, nama: "Budi Santoso", jabatan: "Satpam", gaji_dasar: 2800000, total_bonus: 400000, total_potongan: 0, gaji_bersih: 3200000, status: "Pending" },
    { id: 4, nama: "Citra Lestari", jabatan: "Teknisi Mesin", gaji_dasar: 4000000, total_bonus: 200000, total_potongan: 150000, gaji_bersih: 4050000, status: "Pending" },
    { id: 5, nama: "Dedi Kurniawan", jabatan: "Helper", gaji_dasar: 2500000, total_bonus: 250000, total_potongan: 20000, gaji_bersih: 2730000, status: "Dibayar" },
];

const dummyJabatan: MasterGajiData[] = [
    { id: "jbt-1", nama_jabatan: "Admin 1", departemen: "Administrasi" },
    { id: "jbt-2", nama_jabatan: "Satpam", departemen: "Administrasi" },
    { id: "jbt-3", nama_jabatan: "Molder 1", departemen: "Produksi" },
    { id: "jbt-4", nama_jabatan: "Helper", departemen: "Produksi" },
    { id: "jbt-5", nama_jabatan: "Teknisi Mesin", departemen: "Maintenance" },
];

export default function GajiTunjanganIndex() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // State tab diubah dari 'payroll' menjadi 'rekap'
    const [activeTab, setActiveTab] = useState<'rekap' | 'master'>(location.state?.tab || 'rekap');
    const [periode, setPeriode] = useState("bulan"); 
    const [filterValue, setFilterValue] = useState(""); 

    const handlePeriodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPeriode(e.target.value);
        setFilterValue(""); 
    };

    const handleFilter = () => {
        if (!filterValue && periode !== "minggu") {
            alert("Harap pilih tanggal/waktu terlebih dahulu!");
            return;
        }
        console.log("Siap tembak API:", { jenisPeriode: periode, nilaiWaktu: filterValue });
        alert(`Memuat data rekap gaji ${periode}...`);
    };

    const handleNavigasiAturGaji = (id: number | string) => {
        navigate(`/dashboard/gaji-tunjangan/master-gaji/${id}`);
    };

    return (
        <div className="flex flex-col gap-6 w-full p-2">
            
            {/* SISTEM TAB NAVIGASI */}
            <div className="flex gap-6 border-b border-gray-200 px-2">
                <button
                    onClick={() => setActiveTab('rekap')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                        activeTab === 'rekap' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Rekap Gaji Karyawan
                </button>
                <button
                    onClick={() => setActiveTab('master')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                        activeTab === 'master' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Master Gaji Jabatan
                </button>
            </div>

            {/* KONTEN TAB 1: REKAP GAJI */}
            {activeTab === 'rekap' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                    {/* WIDGETS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Wallet size={24} /></div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Estimasi Pengeluaran</p>
                                <h3 className="text-xl font-bold text-gray-800">{formatRupiah(17430000)}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={24} /></div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total Bonus Disalurkan</p>
                                <h3 className="text-xl font-bold text-gray-800">{formatRupiah(1650000)}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg"><TrendingDown size={24} /></div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total Potongan Denda</p>
                                <h3 className="text-xl font-bold text-gray-800">{formatRupiah(220000)}</h3>
                            </div>
                        </div>
                    </div>

                    {/* TABEL DATA GAJI */}
                    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 gap-4">
                            <h2 className="text-lg font-bold text-gray-700">Rincian Gaji Karyawan</h2>
                            
                            <div className="flex gap-2 w-full md:w-auto">
                                <select value={periode} onChange={handlePeriodeChange} className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-red-500 shadow-sm text-sm">
                                    <option value="hari">Harian</option>
                                    <option value="minggu">Mingguan</option>
                                    <option value="bulan">Bulanan</option>
                                    <option value="tahun">Tahunan</option>
                                </select>

                                {periode === "hari" && <input type="date" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-red-500 shadow-sm text-sm" />}
                                {periode === "minggu" && <input type="week" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-red-500 shadow-sm text-sm" />}
                                {periode === "bulan" && <input type="month" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-red-500 shadow-sm text-sm" />}
                                {periode === "tahun" && (
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            views={['year']}
                                            value={filterValue ? dayjs().year(parseInt(filterValue)) : null}
                                            onChange={(newValue: Dayjs | null) => newValue && setFilterValue(newValue.year().toString())}
                                            slotProps={{ textField: { size: 'small', className: "bg-white w-32", sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px' } } } }}
                                        />
                                    </LocalizationProvider>
                                )}
                                <Button label="Filter" onClick={handleFilter} />
                            </div>
                        </div>

                        {/* PANGGIL KOMPONEN TABEL REKAP GAJI DI SINI */}
                        <TabelRekapGaji data={dummyRekapGaji} />

                    </section>
                </div>
            )}

            {/* KONTEN TAB 2: MASTER GAJI JABATAN */}
            {activeTab === 'master' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h1 className="text-xl font-bold text-gray-800 mb-1">Standar Upah & Bonus</h1>
                        <p className="text-sm text-gray-500 mb-6">Atur nominal gaji pokok, tunjangan, dan bonus berdasarkan masing-masing jabatan.</p>
                        
                        {/* PANGGIL KOMPONEN TABEL MASTER GAJI DI SINI */}
                        <TabelMasterGaji data={dummyJabatan} onAturGaji={handleNavigasiAturGaji} />

                    </div>
                </div>
            )}
        </div>
    );
}