import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { Settings } from 'lucide-react';

// Export interface agar bisa dipakai sebagai tipe data di GajiTunjanganIndex
export interface MasterGajiData {
    id: number | string;
    nama_jabatan: string;
    departemen: string;
}

interface TabelMasterGajiProps {
    data: MasterGajiData[];
    onAturGaji: (id: number | string) => void; 
}

export const TabelMasterGaji = ({ data, onAturGaji }: TabelMasterGajiProps) => {
    
    // Definisi Kolom Tabel Master Gaji
    const columns: GridColDef[] = [
        { 
            field: 'nama_jabatan', 
            headerName: 'Nama Jabatan', 
            flex: 1, 
            renderCell: (params) => <span className="font-semibold text-gray-800">{params.value}</span> 
        },
        { 
            field: 'departemen', 
            headerName: 'Departemen', 
            flex: 1 
        },
        {
            field: 'aksi',
            headerName: 'Aksi',
            width: 150,
            sortable: false,
            align: 'center',
            renderCell: (params) => (
                <button 
                    onClick={() => onAturGaji(params.row.id)}
                    className="flex items-center gap-1 text-sm text-red-600 font-medium hover:text-red-800 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <Settings size={16} /> Atur Gaji
                </button>
            )
        }
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