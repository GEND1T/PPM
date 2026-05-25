import { useEffect, useState } from "react";
import { useLocation, matchPath } from "react-router-dom"; // <-- DITAMBAHKAN matchPath
import DateTime from "./ui/DateTime";

export default function Header() {
    // --- LOGIKA SHIFT ---
    const [currentShift, setCurrentShift] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchShiftData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(""); 
                if (!response.ok) throw new Error("Backend tidak merespons");
                
                const data = await response.json();
                setCurrentShift(data.shift);
            } catch (error) {
                console.error("Gagal mengambil data shift:", error);
                setCurrentShift("Shift 1"); 
            } finally {
                setIsLoading(false);
            }
        };

        fetchShiftData();
    }, []);

    // --- LOGIKA NAVIGASI DINAMIS ---
    const location = useLocation();
    
    // 2. Buat Kamus Rute
    const routeConfig: Record<string, { title: string; showDate: boolean }> = {
        "/": { title: "Monitoring Absensi", showDate: true },
        "/dashboard": { title: "Monitoring Absensi", showDate: true },

        "/dashboard/data-karyawan": { title: "Data Karyawan", showDate: false },
        "/dashboard/data-karyawan/tambah-karyawan": { title: "Tambah Karyawan", showDate: false },
        "/dashboard/data-karyawan/:id": { title: "Detail Karyawan", showDate: false },

        "/dashboard/departemen": { title: "Departemen", showDate: false },
        "/dashboard/departemen/tambah-departemen": { title: "Tambah Departemen", showDate: false },
        "/dashboard/departemen/:id": { title: "Detail Departemen", showDate: false },


        "/dashboard/jabatan": { title: "Jabatan", showDate: false },


        "/dashboard/rekap-data": { title: "Rekap Data", showDate: false },


        "/dashboard/jadwal-shift": { title: "Jadwal & Shift", showDate: false },
        


        "/dashboard/gaji-tunjangan":{ title: "Gaji & Tunjangan", showDate: false },
    };

    // 3. DIUBAH: Cari pengaturan berdasarkan URL menggunakan matchPath
    let currentRoute = { title: "Dashboard", showDate: false }; 

    for (const pattern in routeConfig) {
        if (matchPath({ path: pattern, end: true }, location.pathname)) {
            currentRoute = routeConfig[pattern];
            break; 
        }
    }

    return (
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-4 drop-shadow-sm w-full gap-4">
            
            {/* KIRI */}
            <div className="flex flex-col items-center justify-between w-full md:w-auto">
                <div className="flex flex-col my-4">
                    {/* 4. Cetak Judul Dinamis */}
                    <h1 className="text-2xl md:text-3xl font-bold text-black leading-none">
                        {currentRoute.title}
                    </h1>
                </div>
                <div className="md:hidden bg-[#C90000] rounded-full flex items-center gap-2 pr-4 pl-1 py-1 my-2 shadow-md ">
                    <div className="bg-[#FFB800] w-8 h-8 rounded-full border-2 border-white/20"></div>
                    <span className="text-white font-medium text-base md:text-xs tracking-wide text-center">Admin 1</span>
                </div>
            </div>

            {/* TENGAH: Lempar data ke DateTime */}
            {/* 5. Tampilkan DateTime HANYA jika showDate bernilai true */}
            {currentRoute.showDate && (
                <div className="w-full md:w-auto flex justify-center">
                    <DateTime shift={currentShift} isLoading={isLoading} />
                </div>
            )}

            {/* KANAN */}
            <div className="hidden md:flex bg-[#C90003] rounded-full items-center gap-3 pr-6 pl-1 py-1 shadow-md cursor-pointer hover:bg-red-800 transition-colors">
                <div className="bg-[#FFB800] w-10 h-10 rounded-full border-2 border-white/20"></div>
                <span className="text-white font-medium text-base md:text-lg tracking-wide text-center">Admin 1</span>
            </div>

        </header>
    );
}