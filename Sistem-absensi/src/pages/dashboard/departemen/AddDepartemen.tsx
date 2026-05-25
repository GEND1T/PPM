import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import Button from "../../../components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../components/ui/InputText";


type FormData = {
    id: string;
    nama: string;
   
   
}
const schema = z.object({
    id: z.string().min(1, "ID Departemen harus diisi"),
    nama: z.string().min(1, "Nama Departemen harus diisi"),
   
})

const onSubmit = (data: FormData) => {
    console.log(data);
};


export default function AddDepartemen() {
    const navigate = useNavigate();
    const {
            register,
            handleSubmit,
            formState: { errors }
        } = useForm<FormData>({
            resolver: zodResolver(schema)
        });
        
    return ( 
        <div className="p-6 max-w-2xlmx-auto w-full">
            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">

                <div className="flex grid-cols-1 md:grid-cols-2 justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">
                        Tambah Departemen
                    </h2>
                    <Button
                        variant="back"
                        icon={<ArrowLeft size={24} />}
                        onClick={() => navigate(-1)}
                        label="Kembali" // Walau teksnya disembunyikan, ini muncul sbg tooltip kalau di-hover!
                    />

                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                    {/* Input Nama */}
                    <div>

                        <Input
                            label="ID Departemen"
                            nama="id"
                            register={register}
                            error={errors.id?.message}
                        />
                        <Input
                            label="Nama Departemen"
                            nama="nama"
                            register={register}
                            error={errors.nama?.message}
                        />

                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-5 border-t border-gray-200">
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
    );
}