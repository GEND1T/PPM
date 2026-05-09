import { Calendar, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface DateTimeProps{
    shift: string;
    isLoading?: boolean;
}

export default function DateTime({shift, isLoading = false }: DateTimeProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);

    }, []);

    const formatedDate = time.toLocaleDateString("id-ID",{
        day: "numeric", month: "long", year: "numeric",
    });

    const formatedDay = time.toLocaleDateString("id-ID", {weekday: "long"});
    const formatedTime = time.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    }).replace("."," : ");


    return(
        <div className="flex items-center justify-center gap-4 md:gap-10 border border-gray-300 rounded-2xl px-4 md:px-6 py-2 bg-white w-full md:w-auto">

            {/* Bagian tanggal */}
            <div className="flex items-center gap-2">
                <Calendar size={30} className="text-black"/>
                <div className="flex flex-col">
                    <span className="text-lg md:text-xs text-gray-400 font-medium ">Tangal</span>
                    <span className="text-base md:text-xl font-bold py-0.5">{formatedDate}</span>
                    <span className="text-lg md:text-lg font-semibold">{formatedDay}</span>
                </div>

            </div>


            {/* Bagian jam */}
            <div className="flex items-center gap-2">
                <Clock size={30} className="text-black"/>
                <div className="flex flex-col items-center">
                    <span className="text-lg md:text-xs text-gray-400 font-medium">Jam</span>
                    <span className="text-base md:text-xl font-bold mb-1">{formatedTime}</span>

                    <span className={`text-white text-lg font-bold px-3 py-0.5 rounded-full transition-colors ${
                        isLoading ? "bg-gray-400 animate-pulse" :
                        shift === "Error" ? "bg-red-500" : "bg-[#ffb702]"
                    }`}>
                        {isLoading ? "Loading..." : shift}
                    </span>

                </div>
            </div>
        </div>
    )
}