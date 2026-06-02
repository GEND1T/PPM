import type React from "react";

interface InputTextProps{
    label:string;
    nama:string;
    type?:"text" | "number" 
    error?:string;
    register:any;
}

export const Input: React.FC <InputTextProps> = ({
    label,
    nama,
    type = "text",
    error,
    register,
}) => {
    return (
        <div className="flex flex-col gap-1 mb-4">
            {/* 3. Perbaikan kecil: htmlFor sebaiknya pakai 'nama', bukan 'label' karena label sering pakai spasi */}
            <label htmlFor={nama} className="text-sm font-medium text-gray-700">
                {label}
            </label>
            <input
                id={nama}
                type={type} // 4. Pasang type dinamisnya di sini
                {...register(nama, { valueAsNumber: type === "number" })} // Trik React Hook Form agar outputnya murni Number, bukan String
                className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-red-500"
                placeholder={`Masukkan ${label}`} 
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};