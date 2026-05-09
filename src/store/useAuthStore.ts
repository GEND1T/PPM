
import { persist } from "zustand/middleware";
import { create  } from "zustand";

interface AuthState{
    isAuthenticated : boolean;
    user : string | null
    login : (userName : string) => void;
    logout : () => void;

}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            login: (userName: string) => 
                set ({isAuthenticated: true, user: userName}),
            logout: () => set({ isAuthenticated: false, user:null}),

        }),
        {
            name: "auth-storage",
        },
    ),
);