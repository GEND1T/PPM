import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Clock, AlertCircle, Banknote } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import Button from '../../../components/ui/Button';
import { Input } from '../../../components/ui/InputText';

// 1. SCHEMA ZOD - Disesuaikan dengan penamaan presisi dari Database
const schema = z.object({
    kode_shift: z.string().min(1, "Kode shift wajib diisi"),
    jam_masuk: z.string().min(1, "Jam masuk wajib diisi"),
    jam_pulang: z.string().min(1, "Jam pulang wajib diisi"),
    batas_toleransi_menit: z.coerce.number().min(0).default(0),
    batas_maksimal_lembur_menit: z.coerce.number().min(0).default(0),
    lintas_hari: z.boolean().default(false),
    
    // Logika Terlambat & Scan Masuk
    is_potong_gaji_terlambat: z.boolean().default(false),
    denda_terlambat_per_menit: z.coerce.number().min(0).default(0),
    batas_akhir_scan_masuk_menit: z.coerce.number().min(0).default(0), // Ditambahkan _menit

    // Logika Pulang Awal & Scan Pulang
    is_potong_gaji_pulang_awal: z.boolean().default(false),
    toleransi_pulang_awal_menit: z.coerce.number().min(0).default(0), // Ditambahkan _menit
    denda_pulang_awal_per_menit: z.coerce.number().min(0).default(0),
    batas_akhir_scan_pulang_menit: z.coerce.number().min(0).default(0), // Ditambahkan _menit
});

type ShiftForm = z.infer<typeof schema>;

export default function AddShift() {
    const navigate = useNavigate();
    
    const { register, handleSubmit, watch, formState: { errors } } = useForm<ShiftForm>({
        resolver: zodResolver(schema) as any,
        defaultValues: { 
            lintas_hari: false, 
            is_potong_gaji_terlambat: false, 
            is_potong_gaji_pulang_awal: false 
        }
    });

    const onSubmit: SubmitHandler<ShiftForm>= (data: ShiftForm) => {
        console.log("Data Shift Baru:", data);
        alert("Shift berhasil disimpan!");
        navigate(-1);
    };

    return (
        <div className="flex flex-col gap-6 w-full p-2 max-w-5xl mx-auto">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Tambah Konfigurasi Shift</h1>
                    <p className="text-sm text-gray-500">Atur jadwal, toleransi, dan denda keterlambatan.</p>
                </div>
                <Button variant="back" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} label="Kembali" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* GRUP 1: WAKTU UTAMA */}
                <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2 text-blue-600 font-bold border-b pb-2">
                        <Clock size={20} /> <h2>Informasi Waktu & Utama</h2>
                    </div>
                    <Input 
                        label="Kode Shift" 
                        nama="kode_shift" 
                        placeholder="Contoh: SHIFT_PAGI"
                        register={register} 
                        error={errors.kode_shift?.message} 
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Jam Masuk" nama="jam_masuk" type="time" register={register} error={errors.jam_masuk?.message} />
                        <Input label="Jam Pulang" nama="jam_pulang" type="time" register={register} error={errors.jam_pulang?.message} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <input type="checkbox" id="lintas_hari" {...register("lintas_hari")} className="w-5 h-5 cursor-pointer" />
                        <label htmlFor="lintas_hari" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Aktifkan Lintas Hari (Shift Malam)
                        </label>
                    </div>
                </section>

                {/* GRUP 2: TOLERANSI & SCAN */}
                <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2 text-orange-600 font-bold border-b pb-2">
                        <AlertCircle size={20} /> <h2>Toleransi & Batas Scan</h2>
                    </div>
                    <Input 
                        label="Batas Toleransi (Menit)" 
                        nama="batas_toleransi_menit" 
                        type="number" 
                        placeholder="0"
                        register={register} 
                        error={errors.batas_toleransi_menit?.message}
                    />
                    <Input 
                        label="Batas Maksimal Lembur (Menit)" 
                        nama="batas_maksimal_lembur_menit" 
                        type="number" 
                        placeholder="0"
                        register={register} 
                        error={errors.batas_maksimal_lembur_menit?.message}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Batas Scan Masuk (Menit)" nama="batas_akhir_scan_masuk_menit" type="number" placeholder="120" register={register} />
                        <Input label="Batas Scan Pulang (Menit)" nama="batas_akhir_scan_pulang_menit" type="number" placeholder="120" register={register} />
                    </div>
                </section>

                {/* GRUP 3: DENDA TERLAMBAT */}
                <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2 text-red-600 font-bold border-b pb-2">
                        <Banknote size={20} /> <h2>Aturan Denda Terlambat</h2>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <input type="checkbox" id="is_potong_gaji_terlambat" {...register("is_potong_gaji_terlambat")} className="w-5 h-5 cursor-pointer" />
                        <label htmlFor="is_potong_gaji_terlambat" className="text-sm font-medium text-gray-700 cursor-pointer">Potong Gaji Jika Terlambat</label>
                    </div>
                    <Input 
                        label="Denda Terlambat (Rp/Menit)" 
                        nama="denda_terlambat_per_menit" 
                        type="number" 
                        placeholder="Masukkan nominal"
                        register={register} 
                        disabled={!watch("is_potong_gaji_terlambat")}
                        error={errors.denda_terlambat_per_menit?.message}
                    />
                </section>

                {/* GRUP 4: DENDA PULANG AWAL */}
                <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2 text-purple-600 font-bold border-b pb-2">
                        <Banknote size={20} /> <h2>Aturan Pulang Awal</h2>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <input type="checkbox" id="is_potong_gaji_pulang_awal" {...register("is_potong_gaji_pulang_awal")} className="w-5 h-5 cursor-pointer" />
                        <label htmlFor="is_potong_gaji_pulang_awal" className="text-sm font-medium text-gray-700 cursor-pointer">Potong Gaji Jika Pulang Awal</label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Toleransi (Menit)" 
                            nama="toleransi_pulang_awal_menit" 
                            type="number" 
                            placeholder="0"
                            register={register} 
                            disabled={!watch("is_potong_gaji_pulang_awal")}
                        />
                        <Input 
                            label="Denda (Rp/Menit)" 
                            nama="denda_pulang_awal_per_menit" 
                            type="number" 
                            placeholder="Nominal"
                            register={register} 
                            disabled={!watch("is_potong_gaji_pulang_awal")}
                        />
                    </div>
                </section>

                <div className="md:col-span-2 flex justify-end gap-4 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <Button type="submit" label="Simpan Konfigurasi Shift" icon={<Save size={20} />} />
                </div>
            </form>
        </div>
    );
}