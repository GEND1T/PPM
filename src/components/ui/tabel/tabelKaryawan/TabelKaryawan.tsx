import { useNavigate } from 'react-router-dom';
import { useState } from "react";
import { 
    DataGrid, 
    type GridColDef, 
    type GridRowModesModel, 
    GridRowModes, 
    GridActionsCellItem, 
    type GridRowId, 
    type GridRowModel,

} from "@mui/x-data-grid";
import { Pencil, Trash2, Save, X } from "lucide-react";


export interface KaryawanItem {
    id: string;
    nama: string;
    departemen: string;
    jabatan: string;
    shift: string | number;
    masakerja: string;
}

interface TabelKaryawanProps {
    data: KaryawanItem[];
}

export default function TabelKaryawan({ data: initialData }: TabelKaryawanProps) {

    // State untuk menyimpan data baris dan mode edit dari MUI DataGrid
    const [rows, setRows] = useState<KaryawanItem[]>(initialData);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

    // --- FUNGSI-FUNGSI AKSI ---
    
    // 1. Mulai Edit (Ikon Pencil)
    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
    };

    // 2. Simpan Edit (Ikon Save)
    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    };

    // 3. Batal Edit (Ikon X)
    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });
    };

    // 4. Hapus Data (Ikon Tempat Sampah)
    const handleDeleteClick = (id: GridRowId) => () => {
        const isConfirm = window.confirm("Apakah Anda yakin ingin menghapus data karyawan ini?");
        if (isConfirm) {
            setRows(rows.filter((row) => row.id !== id));
            console.log("Data dengan ID dihapus:", id);
        }
    };

    // --- FUNGSI UPDATE DATA KE STATE ---
    const processRowUpdate = (newRow: GridRowModel) => {
        const updatedRow = { ...newRow } as KaryawanItem;
        setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
        
        console.log("Data berhasil diubah:", updatedRow); // Nanti ganti dengan fungsi API/Axios ke backend
        return updatedRow;
    };

    const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };
  
    const navigate = useNavigate();
    // --- DEFINISI KOLOM ---
    const columns: GridColDef[] = [
        { field: 'id', headerName: 'Id', width: 70 },
        {
            field: 'nama',
            headerName: 'Nama',
            flex: 1,
            minWidth: 150,
            editable: true,
            renderCell: (params) => {
                return (
                    <button
                        // Arahkan ke halaman detail berdasarkan ID karyawan
                        onClick={() => navigate(`/dashboard/data-karyawan/${params.row.id}`)}
                        className="text-black hover:text-red-700 hover:underline font-semibold text-left transition-colors"
                    >
                        {params.value}
                    </button>
                );
            }
        },

        { field: 'departemen', headerName: 'Departemen', flex: 1, minWidth: 130, editable: true, type: 'singleSelect', valueOptions: ["Produksi", "Administrasi",] },
        { field: 'jabatan', headerName: 'Jabatan', flex: 1, minWidth: 120, editable: true },
        { field: 'shift', headerName: 'Shift', width: 120, align: 'center', headerAlign: 'center', editable: true, type: 'singleSelect', valueOptions: ["Shift 1", "Shift 2"], },
        { field: 'masakerja', headerName: 'Masa Kerja', flex: 1, minWidth: 130, align: 'center', headerAlign: 'center', editable: true },
        {
            field: 'actions',
            type: 'actions', 
            headerName: 'Aksi',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }) => {
                const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

                // Jika sedang mode EDIT, tampilkan Save dan X
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
                            className="textPrimary"
                            onClick={handleCancelClick(id)}
                            color="inherit"
                        />,
                    ];
                }

                // Jika mode NORMAL, tampilkan Pencil dan Trash
                return [
                    <GridActionsCellItem
                        icon={<Pencil size={18} className="text-gray-600 hover:text-black" />}
                        label="Edit"
                        className="textPrimary"
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
        <div className="w-full bg-white">
            <DataGrid
                showToolbar
                autoHeight
                rows={rows}
                columns={columns}
                editMode="row" // Mengubah satu baris penuh sekaligus
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={(error) => console.error("Gagal update baris:", error)}
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 5 },
                    },
                }}
                pageSizeOptions={[5, 10, 20]}
                disableRowSelectionOnClick
                sx={{
                    border: "1px solid #e5e7eb",
                    "& .MuiDataGrid-columnHeaders": {
                        backgroundColor: "#f3f4f6",
                        color: "black",
                        fontWeight: "bold",
                        borderBottom: "1px solid #9ca3af",
                    },
                }}
            />
        </div>
    );
}