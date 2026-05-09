interface CardInfoKaryawanProps {
    title: string;
    value: string | number
    subtitle?: string

}
export default function CardInfoKaryawan({title, value, subtitle,  }: CardInfoKaryawanProps){

    
    return(
        <div className={`flex flex-col items-center justify-center p-4 border rounded-xl shadow-sm w-full h-32`}>
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
