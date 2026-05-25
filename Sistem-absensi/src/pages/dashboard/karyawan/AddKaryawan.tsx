import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button";

import { TextArea } from "../../../components/ui/TextArea";
import InputSelect from "../../../components/ui/InputSelect";
import { Input } from "../../../components/ui/InputText";
import { useEffect } from "react";



// 2. REVISI SCHEMA ZOD (Memperbaiki typo dan sinkronisasi)
const schema = z.object({
    id: z.string().min(1, "ID Karyawan harus diisi"),
    nik: z.string().min(1, "NIK Karyawan harus diisi"),
    nama: z.string().min(1, "Nama Karyawan harus diisi"),
    nohp: z.string().min(1, "Nomor HP harus diisi"),
    alamat: z.string().min(1, "Alamat Karyawan harus diisi"),
    departemen: z.string().min(1, "Departemen harus dipilih"),

    // Tetap min(1) agar user tidak bisa simpan kalau jabatan kosong setelah kena reset
    jabatan: z.string().min(1, "Jabatan harus dipilih sesuai departemen"),
    shift: z.string().min(1, "Shift harus dipilih"),
});
type FormData = z.infer<typeof schema>;





export default function AddKaryawan() {
    const navigate = useNavigate();

    // Tambahkan watch dan setValue di sini
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    // DATA DROPDOWN
    const pilihanDepartemen = [
        { value: "Administrasi", label: "Administrasi" },
        { value: "Produksi", label: "Produksi" },
        { value: "Maintenance", label: "Maintenance" }
    ];

    // Tambahkan kunci 'dept' pada setiap jabatan untuk filter
    const masterJabatan = [
        { value: "Admin 1", label: "Admin 1", dept: "Administrasi" },
        { value: "Admin 2", label: "Admin 2", dept: "Administrasi" },
        { value: "Molder", label: "Molder", dept: "Produksi" },
        { value: "Helper", label: "Helper", dept: "Produksi" },
        { value: "Teknisi", label: "Teknisi", dept: "Maintenance" }
    ];

    const pilihanShift = [
        { value: "Shift 1", label: "Shift 1" },
        { value: "Shift 2", label: "Shift 2" },
    ];

    // --- LOGIKA DEPENDENT DROPDOWN ---

    // 1. Pantau nilai departemen
    const selectedDept = watch("departemen");

    // 2. Filter jabatan berdasarkan departemen yang dipilih
    const filteredJabatan = masterJabatan.filter(jbt => jbt.dept === selectedDept);

    // 3. Reset jabatan jika departemen berubah
    useEffect(() => {
        setValue("jabatan", "");
    }, [selectedDept, setValue]);

    const onSubmit: SubmitHandler<FormData> = (data) => {
        console.log(data);
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Tambah Karyawan
                    </h2>
                    <Button
                        variant="back"
                        icon={<ArrowLeft size={24} />}
                        onClick={() => navigate(-1)}
                        label="Kembali"
                    />
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="ID Karyawan"
                            nama="id"
                            register={register}
                            error={errors.id?.message}
                        />
                        <Input
                            label="NIK Karyawan"
                            nama="nik"
                            register={register}
                            error={errors.nik?.message}
                        />
                        <Input
                            label="Nama Karyawan"
                            nama="nama"
                            register={register}
                            error={errors.nama?.message}
                        />
                        <Input
                            label="Nomor HP"
                            nama="nohp"
                            register={register}
                            error={errors.nohp?.message}
                        />

                        <InputSelect
                            label="Departemen"
                            nama="departemen"
                            register={register}
                            error={errors.departemen?.message}
                            options={pilihanDepartemen}
                        />

                        <InputSelect
                            label="Jabatan"
                            nama="jabatan"
                            register={register}
                            error={errors.jabatan?.message}
                            options={filteredJabatan} // Gunakan data yang sudah di-filter
                            disabled={!selectedDept} // Kunci jika departemen belum dipilih
                        />

                        <InputSelect
                            label="Shift"
                            nama="shift"
                            register={register}
                            error={errors.shift?.message}
                            options={pilihanShift}
                        />

                        <TextArea
                            label="Alamat"
                            name="alamat"
                            register={register}
                            error={errors.alamat?.message}
                            className="md:col-span-2"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-5">
                        <Button type="submit" label="Simpan" />
                        <Button
                            type="button"
                            variant="secondary"
                            label="Batal"
                            onClick={() => navigate(-1)}
                        />
                    </div>
                </form>
            </div>
        </div>
    )
}