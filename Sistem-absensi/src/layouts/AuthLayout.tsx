import { Outlet } from "react-router-dom";

export default function AuthLayout(){
    return(
        <div className='grid grid-cols-2 min-h-screen items-center'>
            
            {/* kiri */}
            <div className="bg-gray-100 h-screen flex flex-col items-center justify-center">
                <img
                    src=""
                    alt=""
                    className='w-96'
                />
            </div>

            {/* kanan */}
            <div className="p-6">
                <Outlet/>
            </div>
       
        </div>

    );
}