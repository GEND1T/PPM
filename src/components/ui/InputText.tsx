import type React from "react";

interface InputTextProps{
    label:string;
    nama:string;
    type?:string;
    error?:string;
    register:any;
    disabled?: boolean;
    placeholder?: string;
}

export const Input: React.FC <InputTextProps> = ({
    label,
    nama,
    type = "text",
    error,
    register,
    placeholder,
    disabled = false
}) => {
    return (
        <div className="flex flex-col gap-1 mb-4">
            {/* 3. Perbaikan kecil: htmlFor sebaiknya pakai 'nama', bukan 'label' karena label sering pakai spasi */}
            <label htmlFor={nama} className="text-sm font-medium text-gray-700">
                {label}
            </label>
            <input
                type={type}
                placeholder={placeholder} // 3. TAMBAHKAN INI DI TAG INPUT
                {...register(nama)}
                disabled={disabled}
                className={`border border-gray-300 rounded-lg px-3 py-2 outline-none transition-all 
                ${error ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'focus:border-blue-500'}
                ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};