
import { useEffect, useState } from "react";
import CardInfo from "../../components/ui/card/CardInfo";
import TabelAbsensi from "../../components/ui/tabel/TabelAbsensi";



export default function DashboardIndex () {

    // 1. Siapkan state untuk data, loading, dan error
    const [attendanceData, setAttendanceData] = useState([]);
    const [stats, setStats] = useState({ hadir: 0, tepat: 0, terlambat: 0, izin: 0, lembur: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // 2. Fungsi untuk mengambil data dari API (misal menggunakan PHP/Laravel/Node.js)
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                // Ganti URL dengan endpoint API backend-mu
                const response = await fetch("http://localhost:8000/api/attendance/today");
                const result = await response.json();

                // 3. Masukkan data dari backend ke dalam state
                setAttendanceData(result.data); // Asumsi backend mengirim { data: [...] }
                setStats(result.statistics);    // Asumsi backend juga mengirim ringkasan angka
            } catch (error) {
                console.error("Gagal mengambil data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);
    const attendanceDummy = [
        { id: 1, nama: "Karyawan A", masuk: "05 : 00", status: "Tepat", pulang: "13 : 10", lembur: "" },
        { id: 2, nama: "Karyawan B", masuk: "05 : 00", status: "Tepat", pulang: "13 : 50", lembur: "" },
        { id: 3, nama: "Karyawan C", masuk: "05 : 05", status: "Tepat", pulang: "13 : 35", lembur: "" },
        { id: 4, nama: "Karyawan D", masuk: "05 : 05", status: "Tepat", pulang: "13 : 18", lembur: "" },
        { id: 5, nama: "Karyawan E", masuk: "05 : 08", status: "Tepat", pulang: "13 : 28", lembur: "" },
        { id: 6, nama: "Karyawan F", masuk: "05 : 20", status: "Terlambat", pulang: "17 : 20", lembur: "Lembur" },
    ];

    return(
        <div className="flex flex-col gap-6 w-full">
            <section id="cardInfo" className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <CardInfo title="Hadir" value={stats.hadir} variant="blue" />
                <CardInfo title="Tepat Waktu" value={stats.tepat} subtitle="Dibawah waktu toleransi" variant="green" />
                <CardInfo title="Terlambat" value={stats.terlambat} subtitle="Diatas 15 Menit" variant="red" />
                <CardInfo title="Izin" value={stats.izin} variant="yellow" />
                <CardInfo title="Lembur" value={stats.lembur} variant="purple" />
            </section>  

            <section className="bg-white border border-gray-300 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col gap-4 w-full overflow-hidden">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-base md:text-lg font-bold text-black">
                        Absensi Karyawan Shift 1
                    </h2>
                    
                </div>
                <TabelAbsensi data={attendanceDummy} />

            </section>

            <section className="bg-white border border-gray-300 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col gap-4 w-full overflow-hidden">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-base md:text-lg font-bold text-black">
                        Absensi Karyawan Shift 2
                    </h2>
                    
                    <div className="flex items-center gap-3">
                        
                    </div>

                </div>

                {isLoading ? (
                    <div className="py-10 text-center animate-pulse text-gray-400">Memuat data dari server...</div>
                ) : (
                    <TabelAbsensi data={attendanceData} />
                )}

            </section>

        </div>
    )
}