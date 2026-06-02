import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-4xl font-bold text-red-600 mb-2">⚠️⚠️</h1>
            <p className="text-gray-600 mb-8">🔒</p>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center border border-gray-100">
                <h2 className="text-xl font-semibold mb-4">Selamat Datang di Sistem Absensi</h2>
                <p className="text-sm text-gray-500 mb-6">Silakan masuk untuk mengakses dashboard admin.</p>
                
                {/* Tombol ke Login */}
                <Button 
                    label="Masuk ke Aplikasi" 
                    onClick={() => navigate('/login')} 
                    className="w-full py-3"
                />
            </div>
        </div>
    );
}