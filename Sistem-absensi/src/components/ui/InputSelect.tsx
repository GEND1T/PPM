import React from 'react';

// Mendefinisikan bentuk data untuk daftar pilihan (options)
export interface SelectOption {
    value: string | number;
    label: string;
}

interface InputSelectProps {
    label: string;
    nama: string;
    register: any; // Menggunakan any agar fleksibel menerima register dari react-hook-form
    error?: string;
    disabled?: boolean;
    options: SelectOption[];
    className?: string;
}

export const InputSelect: React.FC<InputSelectProps> = ({
    label,
    nama,
    register,
    error,
    disabled,
    options,
    className = ""
}) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className="text-sm font-semibold text-gray-700">
                {label}
            </label>
            
            <select
                // Menggabungkan fungsi register dari react-hook-form ke dalam tag select
                {...register(nama)}
                disabled={disabled} 
                defaultValue=""
                className={`w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition-all cursor-pointer ${
                    error ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-red-500"
                }`}
            >
                {/* Opsi default (Placeholder) yang tidak bisa dipilih lagi setelah user memilih */}
                <option value="" disabled hidden>
                    -- Pilih {label} --
                </option>
                
                {/* Melakukan mapping/looping data options dari luar */}
                {options.map((opt, index) => (
                    <option key={index} value={opt.value} className="text-black">
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* Menampilkan pesan error berwarna merah jika ada */}
            {error && (
                <span className="text-xs font-medium text-red-500 mt-0.5">
                    {error}
                </span>
            )}
        </div>
    );
};

export default InputSelect;