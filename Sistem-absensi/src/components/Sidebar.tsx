
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { CalendarDays, DollarSign, File, LaptopMinimal, Layers, LogOut,  Rows2,  Users, X } from "lucide-react";

interface SidebarProps {
    isOpen: boolean;
    closeSidebar: () => void;
}


export default function Sidebar({ isOpen, closeSidebar }: SidebarProps) {
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const handleLogout = () => {
        logout();
        navigate('/'); 
    };

    const navItems = [
        { title: "Monitoring", path: "/dashboard", isEnd: true, icon: LaptopMinimal },
        { title: "Data Karyawan", path: "/dashboard/data-karyawan", isEnd: false, icon: Users },
        { title: "Data Departemen", path: "/dashboard/departemen", isEnd: false, icon: Layers },
        { title: "Data Jabatan", path: "/dashboard/jabatan", isEnd: false, icon: Rows2 },
        { title: "Rekap Data", path: "/dashboard/rekap-data", isEnd: false, icon: File },
        { title: "Jadwal & Shift", path: "/dashboard/jadwal-shift", isEnd: false, icon: CalendarDays },
        { title: "Gaji & Tunjangan", path: "/dashboard/gaji-tunjangan", isEnd: false, icon: DollarSign },
    ];

    return (
        <div className={`
            bg-[#C90003] w-64 flex flex-col justify-between p-6 shadow-xl z-50
            fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
            
            {/* Bagian Atas */}
            <div>
                <div className="mb-10 relative flex items-center justify-center w-full cursor-pointer">
                    <div className="p-6 md:pt-8">
                        <h1 className="font-bold text-3xl text-center text-white tracking-wider w-full">
                            T-Be
                        </h1>
                        <span className="text-white text-sm font-light">(tiga berlian)</span>
                    </div>

                    <button className="md:hidden text-white absolute right-0" onClick={closeSidebar}>
                        <X size={28} />
                    </button>
                </div>

                <nav>
                    <ul className="flex flex-col gap-3 w-full font-medium">
                        {navItems.map((item, index) => {
                            
                            const Icon = item.icon; 
                            
                            return (
                                <li key={index}>
                                    <NavLink 
                                        to={item.path} 
                                        end={item.isEnd} 
                                        onClick={closeSidebar} 
                                        className={({ isActive }) => 
                                            `transition-colors flex items-center gap-3 p-3 rounded-md ${
                                                isActive 
                                                ? "bg-white/20 text-yellow-300 font-bold border-l-4 border-yellow-300" 
                                                : "text-white hover:bg-white/10 hover:text-amber-200"
                                            }`
                                        }>
                                   
                                        <Icon size={20} /> 
                                        <span>{item.title}</span>
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

        
            <div className="flex flex-col items-center gap-8 mt-16">
                <button 
                    type="button" 
                    onClick={handleLogout}
                    className="w-full mx-auto pb-2 flex justify-center items-center gap-3 border-b-[3px] border-white text-white font-semibold cursor-pointer hover:text-yellow-300 hover:border-yellow-200 transition-all"
                >
                    <LogOut size={24} strokeWidth={2.5} />
                    <span className="text-lg">Logout</span>
                </button>
                
                <div className="w-full text-center">
                    <p className="text-[10px] md:text-[12px] font-light text-white/80 leading-tight">
                        &copy; {currentYear} T-Be (tiga berlian)<br/>All Right Reserved
                    </p>
                </div>
            </div>
        </div>
    );
}