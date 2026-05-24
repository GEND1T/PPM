import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Clock, Edit3, Trash2 } from 'lucide-react';
import { Box, IconButton, Tooltip } from '@mui/material';

// 1. Sesuaikan interface dengan struktur Database baru
export interface ShiftData {
    id: number | string;
    kode_shift: string;
    jam_masuk: string;
    jam_pulang: string;
    lintas_hari: boolean;
    is_potong_gaji_terlambat: boolean;
    denda_terlambat_per_menit: number;
}

interface TableShiftProps {
    data: ShiftData[];
    onEdit?: (id: number | string) => void;
    onDelete?: (id: number | string) => void; // Tambahan untuk fitur hapus
}

export const TabelJadwalShift = ({ data, onEdit, onDelete }: TableShiftProps) => {
    
    // 2. Definisi Kolom DataGrid Baru
    const columns: GridColDef[] = [
        { 
            field: 'kode_shift', 
            headerName: 'Kode Shift', 
            flex: 1, 
            renderCell: (params) => <span className="font-bold text-gray-800">{params.value}</span> 
        },
        { 
            field: 'jam_kerja', 
            headerName: 'Jam Kerja', 
            width: 200,
            renderCell: (params) => (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                    <Clock size={14} />
                    {params.row.jam_masuk} - {params.row.jam_pulang}
                </div>
            )
        },
        {
            field: 'lintas_hari',
            headerName: 'Lintas Hari',
            width: 150,
            renderCell: (params) => (
                params.value ? 
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Ya (Overnight)</span> : 
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">Tidak</span>
            )
        },
        {
            field: 'denda',
            headerName: 'Aturan Denda Telat',
            flex: 1,
            renderCell: (params) => (
                params.row.is_potong_gaji_terlambat ? 
                <span className="text-red-600 text-sm font-medium">Rp {params.row.denda_terlambat_per_menit} / menit</span> :
                <span className="text-gray-400 text-sm italic">Tidak ada denda</span>
            )
        },
        {
            field: 'actions',
            headerName: 'Aksi',
            width: 120,
            headerAlign: 'center',
            align: 'center',
            sortable: false,
            renderCell: (params) => (
                <div className="flex gap-2 justify-center">
                    <Tooltip title="Edit Shift">
                        <IconButton 
                            onClick={() => onEdit?.(params.row.id)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5"
                        >
                            <Edit3 size={18} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hapus Shift">
                        <IconButton 
                            onClick={() => onDelete?.(params.row.id)}
                            className="text-red-600 hover:bg-red-50 p-1.5"
                        >
                            <Trash2 size={18} />
                        </IconButton>
                    </Tooltip>
                </div>
            )
        }
    ];

    return (
        <Box sx={{ 
            height: 400, 
            width: '100%', 
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #E5E7EB', // Tambahan border luar agar rapi
            '& .MuiDataGrid-root': { border: 'none' },
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #F3F4F6' },
        }}>
            <DataGrid
                rows={data}
                columns={columns}
                initialState={{
                    pagination: { paginationModel: { pageSize: 5 } },
                }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                autoHeight={false}
            />
        </Box>
    );
};