import { useState } from "react";

import TabelRekapData from "../../../components/ui/tabel/tabelRekapData/TabelRekapData";
import Button from "../../../components/ui/Button"; // Pastikan path ini sesuai dengan file Button milikmu
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

const employeeDummy = [
    { id: "1", nama: "Adies", jabatan: "Admin 1", shift: "shift 1", tepatwaktu: 20, terlambat: 2, izin: 1 },
    { id: "2", nama: "Sudati", jabatan: "Molder 1", shift: "shift 1", tepatwaktu: 18, terlambat: 4, izin: 0 },
    { id: "3", nama: "Budi Santoso", jabatan: "Satpam", shift: "shift 1 ", tepatwaktu: 22, terlambat: 0, izin: 0 },
    { id: "4", nama: "Citra Lestari", jabatan: "Teknisi Mesin", shift: "shift 1 ", tepatwaktu: 15, terlambat: 5, izin: 2 },
    { id: "5", nama: "Dedi Kurniawan", jabatan: "Helper", shift: "shift 1 ", tepatwaktu: 21, terlambat: 1, izin: 1 },
];

export default function RekapDataIndex() {
  

    // 1. STATE UNTUK FILTER
    const [periode, setPeriode] = useState("bulan"); // Default pilihan: bulan
    const [filterValue, setFilterValue] = useState(""); // Menyimpan input spesifik (tanggal/bulan/tahun)
    const [tableData] = useState(employeeDummy); // State data tabel

    // 2. FUNGSI SAAT PERIODE BERUBAH
    const handlePeriodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPeriode(e.target.value);
        setFilterValue(""); // Reset inputan sebelumnya kalau user ganti jenis periode
    };

    // 3. FUNGSI UNTUK MENGIRIM KE BACKEND (Nantinya pakai Axios/Fetch)
    const handleFilter = () => {
        if (!filterValue && periode !== "minggu") {
            alert("Harap pilih tanggal/waktu terlebih dahulu!");
            return;
        }

        // Ini data yang siap kamu kirim ke backend Mas Afin nanti
        const paramsKeBackend = {
            jenisPeriode: periode,
            nilaiWaktu: filterValue
        };

        console.log("🚀 Siap tembak ke API dengan params:", paramsKeBackend);
        alert(`Sedang memuat data ${periode} untuk: ${filterValue || 'Minggu ini'}`);

        // Nanti kode axios.get() ditaruh di sini, lalu hasilnya dimasukkan ke setTableData(response.data)
    };

    return (
        <div className="flex flex-col gap-6 w-full">

            {/* BAGIAN FILTER PERIODE */}
            <section className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm w-full">
                <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Filter Periode</h3>

                <div className="flex flex-col md:flex-row gap-4 items-end">

                    {/* Dropdown Jenis Periode */}
                    <div className="w-full md:w-48 flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Tipe Periode</label>
                        <select
                            value={periode}
                            onChange={handlePeriodeChange}
                            className="border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-red-500"
                        >
                            <option value="hari">Harian</option>
                            <option value="minggu">Mingguan</option>
                            <option value="tahun">Tahunan</option>
                        </select>
                    </div>

                    {/* Input Dinamis berdasarkan Tipe Periode */}
                    <div className="w-full md:w-48 flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Pilih Waktu</label>

                        {periode === "hari" && (
                            <input
                                type="date"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                            />
                        )}

                        {periode === "minggu" && (
                            <input
                                type="week"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                            />
                        )}


                        {periode === "tahun" && (
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Pilih Tahun"
                                    views={['year']} // Kunci agar hanya muncul pilihan tahun
                                    value={filterValue ? dayjs().year(parseInt(filterValue)) : null}
                                    onChange={(newValue: Dayjs | null) => {
                                        if (newValue) {
                                            setFilterValue(newValue.year().toString());
                                        }
                                    }}
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            fullWidth: true,
                                            className: "bg-white",
                                            sx: {
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '8px',
                                                },
                                            }
                                        },
                                    }}
                                />
                            </LocalizationProvider>
                        )}
                    </div>

                    {/* Tombol Terapkan */}
                    <div className="w-full md:w-auto">
                        <Button
                            label="Terapkan Filter"
                            onClick={handleFilter}
                        />
                    </div>
                </div>
            </section>

            {/* BAGIAN TABEL DAN TOMBOL */}
            <section className="bg-white border border-gray-300 rounded-2xl p-4 shadow-sm w-full">
                {/* Header Tabel & Kumpulan Tombol */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-6 gap-4">
                    <h2 className="text-lg font-bold text-black border-l-4 border-red-600 pl-2 mt-1">
                        Rekap Data Karyawan
                    </h2>
                </div>

                {/* PEMANGGILAN KOMPONEN TABEL */}
                <TabelRekapData data={tableData} />
            </section>
        </div>
    );
}