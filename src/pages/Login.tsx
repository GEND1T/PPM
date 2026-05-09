import Button from "../components/ui/Button";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Input } from "../components/ui/InputText";
import { InputPassword } from "../components/ui/InputPassword";


type FormData = {
    email: string;
    password: string;
}

const schema = z.object({
    email: z.string().min(1, "Email harus diisi"),
    password: z.string().min(8, "Password harus diisi"),
})

export default function Login(){
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const { 
        register, 
        handleSubmit, 
        formState: { errors }
     } = useForm<FormData>({
        resolver: zodResolver(schema)
     });
 
    
    
    const onSubmit = (data: FormData) => {
        console.log(data);
        if(data.email == "admin@gmail.com" && data.password == "admin123" ){
            alert("Login berhasil");

            login(data.email)

            navigate("/dashboard");
        }else{
            alert("Email & Password salah");
        }
        
        
    };

    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Input
                    label="Email"
                    nama="email"
                    register={register}
                    error={errors.email?.message}
                />

                <InputPassword
                    label="Password"
                    nama="password"
                    register={register}
                    error={errors.password?.message} 
                />
                <div>
                    <Button type="submit" label="Login" />
                </div>
            </form>
        </div>
    );
};

