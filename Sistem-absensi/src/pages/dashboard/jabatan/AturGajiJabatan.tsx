import { useEffect } from 'react'; // 1. TAMBAHKAN IMPORT INI
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { z } from 'zod';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../../components/ui/InputText'; 


const schema = z.object({
    upahKehadiran: z.coerce.number().min(1, "Upah Kehadiran harus diisi"),
    UpahLemburperJam: z.coerce.number().min(1, "Upah Lembur harus diisi"),
    BonusDisiplinHarian: z.coerce.number().min(1, "Bonus Disiplin harus diisi"),
    BonusKerapianHarian: z.coerce.number().min(1, "Bonus Kerapian harus diisi"),
    BonusFullMingguan6: z.coerce.number().min(1, "Bonus Mingguan (6 Hari) harus diisi"),
    BonusFullMingguan5: z.coerce.number().min(1, "Bonus Mingguan (5 Hari) harus diisi"),
    BonusMingguHarian: z.coerce.number().min(1, "Bonus Minggu Harian harus diisi"),
    BonusLemburTahunan: z.coerce.number().min(1, "Bonus Lembur Tahunan harus diisi"),
});

const dummyJabatan = [
    { id: "jbt-1", nama_jabatan: "Admin 1", departemen: "Administrasi" },
    { id: "jbt-2", nama_jabatan: "Satpam", departemen: "Administrasi" },
    { id: "jbt-3", nama_jabatan: "Molder 1", departemen: "Produksi" },
    { id: "jbt-4", nama_jabatan: "Helper", departemen: "Produksi" },
    { id: "jbt-5", nama_jabatan: "Teknisi Mesin", departemen: "Maintenance" },
];

type GajiFormValues = z.infer<typeof schema>;

export default function AturGajiJabatan() {
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        reset, // 2. KELUARKAN FUNGSI RESET DI SINI
        formState: { errors }
    } = useForm<GajiFormValues>({
        resolver: zodResolver(schema) as any, 
        defaultValues: {
            upahKehadiran: 0,
            UpahLemburperJam: 0,
            BonusDisiplinHarian: 0,
            BonusKerapianHarian: 0,
            // 3. TAMBAHKAN JUGA 4 BONUS INI AGAR TIDAK ERROR "UNCONTROLLED INPUT"
            BonusFullMingguan6: 0,
            BonusFullMingguan5: 0,
            BonusMingguHarian: 0,
            BonusLemburTahunan: 0,
        }
    });

    // 4. EFEK UNTUK UPDATE (MENAMPILKAN DATA LAMA)
    useEffect(() => {
        // Simulasi: Kalau yang diklik "Molder 1" (jbt-3), munculkan data gaji lamanya
        if (id === "jbt-3") {
            const dataGajiLama = {
                upahKehadiran: 120000,
                UpahLemburperJam: 15000,
                BonusDisiplinHarian: 5000,
                BonusKerapianHarian: 5000,
                BonusFullMingguan6: 50000,
                BonusFullMingguan5: 30000,
                BonusMingguHarian: 10000,
                BonusLemburTahunan: 1500000,
            };
            reset(dataGajiLama); 
        }
    }, [id, reset]);

    const onSubmit: SubmitHandler<GajiFormValues> = (data) => {
        console.log("Data siap dikirim ke database:", data);
        alert("Gaji berhasil disimpan/diperbarui!");
    };

    // 5. FUNGSI UNTUK MERESET (MENGHAPUS) GAJI
    const handleDeleteGaji = () => {
        const confirmDelete = window.confirm("Yakin ingin menghapus dan mereset semua gaji jabatan ini?");
        if (confirmDelete) {
            reset({
                upahKehadiran: 0,
                UpahLemburperJam: 0,
                BonusDisiplinHarian: 0,
                BonusKerapianHarian: 0,
                BonusFullMingguan6: 0,
                BonusFullMingguan5: 0,
                BonusMingguHarian: 0,
                BonusLemburTahunan: 0,
            });
            alert("Data gaji berhasil direset!");
        }
    };

    const jabatan = dummyJabatan.find(dept => dept.id === id);
    if (!jabatan) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-xl font-bold text-gray-500">Jabatan tidak ditemukan!</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-red-600 text-white rounded-md">Kembali</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            
            {/* HEADER HALAMAN */}
            <div className="bg-white border border-gray-300 rounded-xl p-5 shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="text-xl text-gray-500 font-semibold mb-1">Pengaturan Gaji & Tunjangan</h2>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-black border-l-4 border-yellow-500 pl-2">
                            {jabatan.nama_jabatan}
                        </h2>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold ml-2">
                            Dept: {jabatan.departemen}
                        </span>
                    </div>
                </div>
                <Button
                    variant="back"
                    icon={<ArrowLeft size={18} />}
                    onClick={() => navigate(-1)}
                    label="Kembali"
                />
            </div>

            {/* FORM INPUT GAJI */}
            <div className="bg-white border border-gray-300 rounded-xl shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Upah Kehadiran"
                            nama="upahKehadiran"
                            type='number'
                            register={register}
                            error={errors.upahKehadiran?.message}
                        />
                        <Input
                            label="Upah Lembur per Jam"
                            nama="UpahLemburperJam"
                            type='number'
                            register={register}
                            error={errors.UpahLemburperJam?.message}
                        />
                        <Input
                            label="Bonus Disiplin Harian"
                            nama="BonusDisiplinHarian"
                            type='number'
                            register={register}
                            error={errors.BonusDisiplinHarian?.message}
                        />
                        <Input
                            label="Bonus Kerapian Harian"
                            nama="BonusKerapianHarian"
                            type='number'
                            register={register}
                            error={errors.BonusKerapianHarian?.message}
                        />
                        <Input
                            label="Bonus Full Mingguan 6 hari"
                            nama="BonusFullMingguan6" // <-- Spasi di depan nama sudah kuhapus
                            type='number'
                            register={register}
                            error={errors.BonusFullMingguan6?.message}
                        />
                        <Input
                            label="Bonus Full Mingguan 5 hari"
                            nama="BonusFullMingguan5" // <-- Spasi di depan nama sudah kuhapus
                            type='number'
                            register={register}
                            error={errors.BonusFullMingguan5?.message}
                        />
                        <Input
                            label="Bonus Mingguan Harian"
                            nama="BonusMingguHarian"
                            type='number'
                            register={register}
                            error={errors.BonusMingguHarian?.message}
                        />
                        <Input
                            label="Bonus Lembur Tahunan"
                            nama="BonusLemburTahunan"
                            type='number'
                            register={register}
                            error={errors.BonusLemburTahunan?.message}
                        />
                    </div>

                    {/* 6. PERUBAHAN DI AREA TOMBOL BAWAH */}
                    <div className="flex justify-between items-center mt-8 pt-5 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={handleDeleteGaji}
                            className="text-red-500 hover:text-red-700 font-medium text-sm flex gap-2 items-center"
                        >
                            Hapus Data Gaji
                        </button>
                        
                        <div className="flex gap-3">
                            <Button 
                                type="button"
                                variant="secondary" 
                                label="Batal"
                                onClick={() => navigate(-1)} 
                            />
                            <Button 
                                type="submit" 
                                label="Simpan Pengaturan" 
                            />
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}