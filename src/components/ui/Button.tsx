

interface ButtonProps {
    label: string;
    variant?: "primary" | "secondary" | "add" | "back";
    type?: "button" | "submit" | "reset";
    onClick?: () => void;
    isLoading?: boolean;
    className? : string;
    icon? : React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    variant = "primary",
    type = "button",
    onClick,
    isLoading = false,
    className = "",
    icon
}) => {

    const baseStyle = "flex items-center justify-center font-bold text-sm transition-colors shadow-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
    const varianStyle = {
        primary: "bg-[#802D43] text-white text-sm px-4 py-1.5 shadow-sm",
        secondary: "border border-[#802D43] text-[#802D43] text-sm px-4 py-1.5 shadow-sm]",
        add: "bg-[#FFB000] hover:bg-yellow-500 text-white rounded-md px-6 py-2 shadow-sm text-sm",
        back: "p-2 text-gray-500 hover:text-black hover:bg-gray-200 rounded-full"
    };
    return (
        <button
            type={type}
            disabled={isLoading}
            onClick={onClick}
            className={`${baseStyle} ${varianStyle[variant]} ${className}`}
            title={label} // Menampilkan teks tooltip saat mouse hover (berguna untuk tombol back)
        >
            {isLoading ? "Loading..." : (
                <>
                    {/* Jika ada icon, tampilkan di sini. Beri margin kanan (mr-2) jika ada teksnya */}
                    {icon && <span className={label ? "mr-2" : ""}>{icon}</span>}
                    {label}
                </>
            )}
        </button>
    );
};

export default Button;