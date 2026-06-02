import React from 'react';

interface TextAreaProps {
    label: string;
    name: string;
    register: any;
    error?: string;
    placeholder?: string;
    className?: string; // 1. Tambahkan ini agar bisa menerima class col-span-2 dari luar
}

export const TextArea: React.FC<TextAreaProps> = ({
    label,
    name,
    register,
    error,
    placeholder,
    className = "" // Default kosong jika tidak diisi
}) => {
    return (
        // 2. Terapkan className dari luar ke div pembungkus ini
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <textarea 
                {...register(name)}
                placeholder={placeholder}
                // 3. Tambahkan w-full di sini, dan sedikit styling agar senada dengan input lain
                className={`border rounded px-3 py-2 min-h-25 w-full outline-none transition-colors ${
                    error ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                }`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    )
}