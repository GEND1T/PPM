import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Import useNavigate
import { 
    DataGrid, 
    type GridColDef, 
    type GridRowModesModel, 
    GridRowModes, 
    GridActionsCellItem, 
    type GridRowId, 
    type GridRowModel 
} from '@mui/x-data-grid';
import { Pencil, Trash2, Save, X, Eye, Building2, Factory, Settings } from 'lucide-react';

// --- INTERFACES ---
export interface KaryawanDetail {
    id: string;
    nama: string;
    jabatan: string;
    shift: string;
}

export interface DepartemenItem {
    id: string;
    nama: string;
    total_karyawan: number;
    karyawan: KaryawanDetail[];
}

interface DepartemenTableProps {
    data?: DepartemenItem[];
}

export default function DepartemenTable({ data: initialData = [] }: DepartemenTableProps) {
    const [rows, setRows] = useState<DepartemenItem[]>(initialData);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
    
    // <-- State Pop-up sudah dihapus -->
    
    const navigate = useNavigate(); // <-- Inisialisasi fungsi navigasi

    // --- FUNGSI-FUNGSI AKSI (MUI DataGrid) ---
    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
    };

    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    };

    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });
    };

    const handleDeleteClick = (id: GridRowId) => () => {
        const isConfirm = window.confirm("Apakah Anda yakin ingin menghapus departemen ini?");
        if (isConfirm) {
            setRows(rows.filter((row) => row.id !== id));
        }
    };

    // Fungsi untuk PINDAH HALAMAN lihat karyawan
    const handleViewEmployees = (id: GridRowId) => () => {
        // Mengarahkan user ke halaman detail berdasarkan ID departemen
        navigate(`/dashboard/departemen/${id}`); 
    };

    const processRowUpdate = (newRow: GridRowModel) => {
        const updatedRow = { ...newRow } as DepartemenItem;
        setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
        console.log("Departemen berhasil diubah:", updatedRow);
        return updatedRow;
    };

    const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };

    // --- DEFINISI KOLOM ---
    const columns: GridColDef[] = [
        // { field: 'id', headerName: 'ID', width: 90 },
        { 
            field: 'nama', 
            headerName: 'Departemen', 
            flex: 1, 
            minWidth: 200, 
            editable: true,
            renderCell: (params) => {
                const nama = params.value as string;
                const namaLower = nama.toLowerCase();
                let Icon = Settings;
                let color = "text-orange-500";
                
                if (namaLower.includes('admin')) { Icon = Building2; color = "text-green-500"; }
                else if (namaLower.includes('produksi')) { Icon = Factory; color = "text-blue-600"; }
                
                return (
                    <div className="flex items-center gap-3 h-full">
                        <div className="p-1 border border-gray-200 rounded-md bg-white shadow-sm">
                            <Icon size={16} className={color} />
                        </div>
                        <span className="font-medium">{nama}</span>
                    </div>
                );
            }
        },
        { 
            field: 'jumlah_jabatan', 
            headerName: 'Jumlah Jabatan', 
            width: 150, 
            align: 'center', 
            headerAlign: 'center',
            renderCell: (params) => <span className="font-bold">{params.value}</span>
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Aksi',
            width: 140,
            cellClassName: 'actions',
            getActions: ({ id }) => {
                const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

                if (isInEditMode) {
                    return [
                        <GridActionsCellItem
                            icon={<Save size={18} className="text-green-600 hover:text-green-800" />}
                            label="Save"
                            onClick={handleSaveClick(id)}
                        />,
                        <GridActionsCellItem
                            icon={<X size={18} className="text-red-600 hover:text-red-800" />}
                            label="Cancel"
                            onClick={handleCancelClick(id)}
                            color="inherit"
                        />,
                    ];
                }

                return [
                    // Tombol Mata sekarang memicu pindah halaman
                    <GridActionsCellItem
                        icon={<Eye size={18} className="text-blue-500 hover:text-blue-700" />}
                        label="Lihat Karyawan"
                        onClick={handleViewEmployees(id)} 
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        icon={<Pencil size={18} className="text-gray-600 hover:text-black" />}
                        label="Edit"
                        onClick={handleEditClick(id)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        icon={<Trash2 size={18} className="text-gray-600 hover:text-red-600" />}
                        label="Delete"
                        onClick={handleDeleteClick(id)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    return (
        <div className="w-full bg-white relative">
            <DataGrid
                autoHeight
                showToolbar
                rows={rows}
                columns={columns}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                processRowUpdate={processRowUpdate}
                initialState={{
                    pagination: { paginationModel: { page: 0, pageSize: 5 } },
                }}
                pageSizeOptions={[5, 10, 20]}
                disableRowSelectionOnClick
                sx={{
                    border: '1px solid #e5e7eb',
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f3f4f6',
                        color: 'black',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #9ca3af',
                    },
                }}
            />
            
            
        </div>
    );
}