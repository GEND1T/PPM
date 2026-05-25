import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Box } from '@mui/material';

// Pindahkan fungsi formatRupiah ke sini agar komponen ini mandiri
const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// Ubah nama interface dari PayrollData ke RekapGajiData
export interface RekapGajiData {
    id: number | string;
    nama: string;
    jabatan: string;
    gaji_dasar: number;
    total_bonus: number;
    total_potongan: number;
    gaji_bersih: number;
    status: string;
}

interface TabelRekapGajiProps {
    data: RekapGajiData[];
}

export const TabelRekapGaji = ({ data }: TabelRekapGajiProps) => {
    // Definisi Kolom Tabel Rekap Gaji
    const columns: GridColDef[] = [
        { field: 'nama', headerName: 'Nama Karyawan', flex: 1, renderCell: (params) => <span className="font-semibold text-gray-800">{params.value}</span> },
        { field: 'jabatan', headerName: 'Jabatan', flex: 1 },
        { field: 'gaji_dasar', headerName: 'Gaji Dasar', width: 130, renderCell: (params) => formatRupiah(params.value) },
        { field: 'total_bonus', headerName: 'Bonus & Tunjangan', width: 150, renderCell: (params) => <span className="text-green-600">+{formatRupiah(params.value)}</span> },
        { field: 'total_potongan', headerName: 'Potongan (Denda)', width: 150, renderCell: (params) => <span className="text-red-600">-{formatRupiah(params.value)}</span> },
        { field: 'gaji_bersih', headerName: 'Take Home Pay', width: 150, renderCell: (params) => <span className="font-bold text-blue-700">{formatRupiah(params.value)}</span> },
    ];

    return (
        <Box sx={{ 
            height: 400, 
            width: '100%', 
            '& .MuiDataGrid-root': { border: 'none' },
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }
        }}>
            <DataGrid
                rows={data}
                columns={columns}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
            />
        </Box>
    );
};