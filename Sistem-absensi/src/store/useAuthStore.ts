
import { persist } from "zustand/middleware";
import { create  } from "zustand";

interface AuthState{
    isAuthenticated : boolean;
    user : string | null
    logout : () => void;
    token: string | null;
    login: (user: string, token: string) => void;
}

    

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
          // State awal (Kosong saat belum login)
          user: null,
          token: null,
          isAuthenticated: false,
    
          // Fungsi Login (Hanya update state, persist otomatis menyimpannya ke localStorage)
          login: (user, token) => set({ 
              user: user, 
              token: token, 
              isAuthenticated: true 
          }),
    
          // Fungsi Logout (Menghapus state, persist otomatis menghapusnya dari localStorage)
          logout: () => set({ 
              user: null, 
              token: null, 
              isAuthenticated: false 
          }),
        }),
        {
          name: "auth-storage", // Ini akan menjadi nama kunci (key) di dalam localStorage browser
        }
      )
);
