interface CardInfoProps {
    title: string;
    value: string | number
    subtitle?: string
    variant: "blue" | "green" | "red" | "yellow" | "purple";

}

export default function CardInfo({title, value, subtitle, variant }: CardInfoProps){

    const colorStyles = {
       blue: "border-b-12 border-blue-300 text-black",
        green: "border-b-12 border-green-300 text-black",
        red: "border-b-12 border-red-300 text-black",
        yellow: "border-b-12 border-yellow-300 text-black", 
        purple: "border-b-12 border-purple-300 text-black",

    };
    return(
        <div className={`flex flex-col items-center justify-center p-4 border rounded-xl shadow-sm w-full h-32  ${colorStyles[variant]}`}>
            <h3 className="text-sm md:text-base font-medium mb-2">{title}</h3>
            <span className="text-3xl md:text-5xl font-bold mb-1">{value}</span>
            {subtitle ? (
                <p className="text-lg md:text-xs italic text-gray-500">{subtitle}</p>
            ): (
                <p className="text-xs md:*:text-xs invisible">spacer</p>
            )}

        </div>
    );
}