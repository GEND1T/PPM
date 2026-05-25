import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    DataGrid, 
    type GridColDef, 
    type GridRowModesModel, 
    GridRowModes, 
    GridActionsCellItem,
    type GridRowId 
} from '@mui/x-data-grid';
import { Eye, Pencil, Trash2, Save, X, Coins } from 'lucide-react';

interface TabelJabatanProps {
    data: any[];
}

export default function TabelJabatan({ data: initialData }: TabelJabatanProps) {
    const navigate = useNavigate();

    // 1. STATE MANAGEMENT UNTUK TABEL CRUD
    // Menyimpan data tabel (karena nanti bisa diedit/dihapus secara lokal sebelum ke backend)
    const [rows, setRows] = useState(initialData);
    
    // Menyimpan status baris mana saja yang sedang dalam mode "Edit"
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

    // --- 2. KUMPULAN FUNGSI HANDLER ---

    // Saat tombol Edit (Pensil) diklik
    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
    };

    // Saat tombol Save (Centang/Simpan) diklik
    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
        // NOTE: Di sini nantinya kamu akan memanggil API Backend (Axios/Fetch) 
        // untuk meng-update data di database MySQL kamu.
    };

    // Saat tombol Cancel (Silang) diklik
    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });

        // Opsional: Jika baris itu adalah baris baru (isNew), hapus dari tabel jika dibatalkan
        const editedRow = rows.find((row) => row.id === id);
        if (editedRow?.isNew) {
            setRows(rows.filter((row) => row.id !== id));
        }
    };

    // Saat tombol Delete (Tong Sampah) diklik
    const handleDeleteClick = (id: GridRowId) => () => {
        if(window.confirm("Apakah Anda yakin ingin menghapus jabatan ini?")) {
            setRows(rows.filter((row) => row.id !== id));
            // NOTE: Di sini nantinya kamu akan memanggil API Backend DELETE
        }
    };

    // Saat tombol Lihat (Mata) diklik
    const handleViewEmployees = (id: GridRowId) => () => {
        // Arahkan ke halaman detail jabatan untuk melihat daftar karyawannya
        navigate(`/dashboard/jabatan/${id}`); 
    };
    // Saat tombol Atur Gaji (Koin) diklik
    const handleAturGaji = (id: GridRowId) => () => {
        // Arahkan ke halaman form atur gaji khusus jabatan ini
        navigate(`/dashboard/jabatan/atur-gaji/${id}`); 
    };

    // Fungsi penting yang dijalankan MUI setelah data selesai diedit di tabel
    const processRowUpdate = (newRow: any) => {
        const updatedRow = { ...newRow, isNew: false };
        setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
        return updatedRow;
    };


    // --- 3. DEFINISI KOLOM ---
    const columns: GridColDef[] = [
        { 
            field: 'nama_jabatan', 
            headerName: 'Nama Jabatan', 
            flex: 1, 
            minWidth: 180,
            editable: true, // Beri tahu MUI bahwa kolom ini bisa diedit!
            renderCell: (params) => (
                <span className="font-medium text-gray-800">{params.value}</span>
            )
        },
        { 
            field: 'departemen', 
            headerName: 'Departemen', 
            flex: 1, 
            minWidth: 150,
            editable: true, // Bisa diedit (Idealnya ini pakai tipe 'singleSelect' dropdown)
            
        },
        { 
            field: 'jumlah_karyawan', 
            headerName: 'Jumlah Karyawan', 
            flex: 1, 
            minWidth: 150,
            align: 'center',
            headerAlign: 'center',
            editable: false, // Biasanya jumlah karyawan tidak bisa diedit manual, otomatis dari sistem
            renderCell: (params) => (
                <span>{params.value} Orang</span>
            )
        },
        {
            field: 'actions', // Sesuai kodemu
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
                    <GridActionsCellItem
                        icon={<Coins size={18} className="text-yellow-500 hover:text-yellow-700" />}
                        label="Atur Gaji"
                        onClick={handleAturGaji(id)}
                        color="inherit"
                    />,
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
        <DataGrid
            autoHeight
            rows={rows} // Gunakan state `rows`, JANGAN `data` dari props
            columns={columns}
            showToolbar
            
            // Pengaturan CRUD Inline Editing
            editMode="row"
            rowModesModel={rowModesModel}
            onRowModesModelChange={(newModel) => setRowModesModel(newModel)}
            processRowUpdate={processRowUpdate}

            initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 5 } },
            }}
            pageSizeOptions={[5, 10]}
            disableRowSelectionOnClick
            sx={{
                border: 'none', 
                '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f9fafb',
                    color: 'black',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #e5e7eb',
                },
                '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid #f3f4f6',
                },
            }}
        />
    );
}