import { useNavigate } from 'react-router-dom';
import { ArrowLeft} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { z } from 'zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Import komponen Input buatanmu
import { Input } from '../../../components/ui/InputText'; // Sesuaikan path-nya ya

// 1. Definisikan Schema Zod (Hanya 2 kolom yang wajib diisi saat awal bikin jabatan)
const schema = z.object({
    nama_jabatan: z.string().min(2, "Nama Jabatan minimal 2 karakter"),
    departemen_id: z.string().min(1, "Departemen wajib dipilih"),
});

type FormValues = z.infer<typeof schema>;

export default function AddJabatan() {
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    

    // 2. Fungsi saat tombol Simpan diklik
   const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            // Karena backend digembok 'verifikasiToken', kita kirim token dummy sementara
            // Jika token ini ditolak, berarti backend mewajibkan token JWT asli dari proses Login
            const token = localStorage.getItem('token') || "TOKEN_DUMMY_SEMENTARA";

            const response = await fetch("http://localhost:3000/api/v1/jabatan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` // Membawa "Tiket" untuk masuk ke backend
                },
                body: JSON.stringify({
                    nama_jabatan: data.nama_jabatan,
                    // Kita ubah jadi Number agar sesuai dengan format ID di database
                    departemen_id: Number(data.departemen_id) 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                if (response.status === 401) throw new Error("Akses ditolak! Token tidak valid.");
                throw new Error(errorData?.message || "Gagal menambahkan Jabatan");
            }

            const result = await response.json();
            console.log("Berhasil disimpan ke Database:", result);

            alert("Jabatan berhasil ditambahkan! 🎉");
            navigate('/dashboard/jabatan');

        } catch (error: any) {
            console.error("CREATE JABATAN ERROR!:", error);
            alert(error.message || "Gagal terhubung ke server.");
        }
    };

    // Data dummy departemen (Nanti kamu fetch dari API/Database)
    const dummyDepartemen = [
        { id: "1", nama: "Administrasi" },
        { id: "2", nama: "Produksi" },
        { id: "3", nama: "Maintenance" },
    ];

    return (
        <div className="p-6 max-w-2xlmx-auto w-full">
            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                {/* HEADER HALAMAN */}
                <div className="flex grid-cols-1 md:grid-cols-2 justify-between">

                    <h2  className="text-2xl font-bold text-gray-800 mb-6">Tambah Jabatan Baru</h2>

                    <Button
                        variant="back"
                        icon={<ArrowLeft size={18} />}
                        onClick={() => navigate(-1)}
                        label="Kembali"
                    />
                </div>

                {/* FORM TAMBAH JABATAN */}

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-5">
                    <div>
                        {/* Input Nama Jabatan */}
                        <Input
                            label="Nama Jabatan"
                            nama="nama_jabatan"
                            type="text"
                            register={register}
                            error={errors.nama_jabatan?.message}
                        />

                        {/* Input Dropdown Departemen (Native HTML Select dg styling Tailwind) */}
                        <div className="flex flex-col gap-1 mb-4">
                            <label htmlFor="departemen_id" className="text-sm font-medium text-gray-700">
                                Pilih Departemen
                            </label>
                            <select
                                id="departemen_id"
                                {...register("departemen_id")}
                                className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-red-500 bg-white"
                            >
                                <option value="">-- Pilih Departemen --</option>
                                {dummyDepartemen.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.nama}
                                    </option>
                                ))}
                            </select>
                            {errors.departemen_id && (
                                <p className="text-red-500 text-sm mt-1">{errors.departemen_id.message}</p>
                            )}
                        </div>

                        {/* AREA TOMBOL */}
                        <div className="flex justify-end gap-3 mt-4 pt-5 border-t border-gray-200">
                            <Button
                                type="submit"
                                label="Simpan Jabatan"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                label="Batal"
                                onClick={() => navigate(-1)}
                            />
                            
                        </div>

                    </div>



                </form>

            </div>



        </div>
    );
}