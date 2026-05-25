import Button from "../components/ui/Button";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Input } from "../components/ui/InputText";
import { InputPassword } from "../components/ui/InputPassword";
import { useState } from "react";

// 1. Ubah email menjadi username agar sesuai dengan backend
type FormData = {
    username: string;
    password: string;
}

// 2. Sesuaikan validasi Zod
const schema = z.object({
    username: z.string().min(1, "Username harus diisi"),
    password: z.string().min(6, "Password minimal 6 karakter"),
})

export default function Login(){
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false); // State untuk loading button
    const { 
        register, 
        handleSubmit, 
        formState: { errors }
     } = useForm<FormData>({
        resolver: zodResolver(schema)
     });
 
    
    // 3. Fungsi Submit ke Backend Vercel
    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            // Tembak API Login yang ada di backend
            const response = await fetch("https://ppmtestingvercel.vercel.app/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: data.username,
                    password: data.password
                }),
            });

            const result = await response.json();

            // Jika status 200 OK dan dari backend mengirim success: true
            if (response.ok && result.success) {
                // Simpan token JWT ke Zustand (dan LocalStorage)
                login(data.username, result.token);
                
                alert("Login berhasil!");
                navigate("/dashboard");
            } else {
                // Tampilkan pesan error dari backend (misal: "Username salah")
                alert(result.message || "Login gagal, periksa kembali data Anda.");
            }

        } catch (error) {
            console.error("Error saat login:", error);
            alert("Terjadi kesalahan saat login. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };
        

    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* 4. Ubah input UI menjadi username */}
                <Input
                    label="Username"
                    nama="username"
                    register={register}
                    error={errors.username?.message}
                />

                <InputPassword
                    label="Password"
                    nama="password"
                    register={register}
                    error={errors.password?.message} 
                />

                <div>
                    {/* Tampilkan status loading di tombol */}
                    <Button 
                        type="submit" 
                        label={isLoading ? "Memproses..." : "Login"} 
                        disabled={isLoading} 
                    />
                </div>
            </form>
        </div>
    );
};

