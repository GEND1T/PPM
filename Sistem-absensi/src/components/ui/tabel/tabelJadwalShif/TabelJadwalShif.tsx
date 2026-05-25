import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Clock, Edit3 } from 'lucide-react';
import { Box, IconButton, Tooltip } from '@mui/material';

interface ShiftData {
    id: number | string;
    divisi: string;
    nama_shift: string;
    jam_masuk: string;
    jam_pulang: string;
    keterangan: string;
}

interface TableShiftProps {
    data: ShiftData[];
    onEdit?: (id: number | string) => void;
}

export const TabelJadwalShift = ({ data, onEdit }: TableShiftProps) => {
    // Definisi Kolom DataGrid
    const columns: GridColDef[] = [
        { 
            field: 'divisi', 
            headerName: 'Divisi / Departemen', 
            flex: 1,
            renderCell: (params) => (
                <span className="font-medium text-gray-800">{params.value}</span>
            )
        },
        { 
            field: 'nama_shift', 
            headerName: 'Nama Shift', 
            flex: 1 
        },
        { 
            field: 'jam_kerja', 
            headerName: 'Jam Kerja', 
            width: 180,
            headerAlign: 'center',
            align: 'center',
            // Kita gabungkan jam_masuk dan jam_pulang di kolom ini
            renderCell: (params) => (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                    <Clock size={14} />
                    {params.row.jam_masuk} - {params.row.jam_pulang}
                </div>
            )
        },
        { 
            field: 'keterangan', 
            headerName: 'Keterangan Hari', 
            flex: 1,
            renderCell: (params) => (
                <span className="text-sm text-gray-500">{params.value}</span>
            )
        },
        {
            field: 'actions',
            headerName: 'Aksi',
            width: 100,
            headerAlign: 'center',
            align: 'center',
            sortable: false,
            renderCell: (params) => (
                <Tooltip title="Edit Shift">
                    <IconButton 
                        onClick={() => onEdit?.(params.row.id)}
                        className="text-gray-400 hover:text-blue-600"
                    >
                        <Edit3 size={18} />
                    </IconButton>
                </Tooltip>
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
            '& .MuiDataGrid-root': {
                border: 'none',
            },
            '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB',
            },
            '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #F3F4F6',
            },
        }}>
            <DataGrid
                rows={data}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 5 },
                    },
                }}
                pageSizeOptions={[5, 10, 25]}
                disableRowSelectionOnClick
                autoHeight={false}
            />
        </Box>
    );
};