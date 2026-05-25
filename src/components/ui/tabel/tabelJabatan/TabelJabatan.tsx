import { useEffect, useState } from 'react';

import {
    DataGrid,
    type GridColDef,
    type GridRowModesModel,
    GridRowModes,
    GridActionsCellItem,
    type GridRowId
} from '@mui/x-data-grid';
import { Pencil, Trash2, Save, X } from 'lucide-react';

interface TabelJabatanProps {
    data: any[];
}

export default function TabelJabatan({ data: initialData }: TabelJabatanProps) {
    const [departemenOptions, setDepartemenOptions] = useState<string[]>([]);
    

    useEffect(() => {
        const fetchDepartemen = async () => {
            try {
                const response = await fetch("http://localhost:3000/api/v1/departemen"); // Sesuaikan endpoint-nya
                const result = await response.json();
                // Asumsi result.data berbentuk array objek: [{id: 1, nama_departemen: 'Produksi'}, ...]
                const names = result.data.map((dept: any) => dept.nama_departemen);
                setDepartemenOptions(names);
            } catch (error) {
                console.error("Gagal ambil opsi departemen:", error);
            }
        };
        fetchDepartemen();
    }, []);


    // 1. STATE MANAGEMENT UNTUK TABEL CRUD
    // Menyimpan data tabel (karena nanti bisa diedit/dihapus secara lokal sebelum ke backend)
    const [rows, setRows] = useState(initialData);
    const [departemenList] = useState(initialData);

    // Menyimpan status baris mana saja yang sedang dalam mode "Edit"
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

    // --- 2. KUMPULAN FUNGSI HANDLER ---

    // Saat tombol Edit (Pensil) diklik
    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
    };

    // Saat tombol Save (Centang/Simpan) diklik
    const handleSaveClick = (id: GridRowId) => async () => {
        // Cari data yang sudah diupdate dari state 'rows'
        const updatedRow = rows.find((row) => row.id === id);

        const selectedDept = departemenList.find(d => d.nama === updatedRow?.departemen);


        try {
            const response = await fetch(`http://localhost:3000/api/v1/jabatan/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nama_jabatan: updatedRow?.nama_jabatan,
                // UBAH JADI departemen_id DAN KIRIM ID-NYA
                    departemen_id: selectedDept?.id
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "Gagal menyimpan ke database");
            }

            // Jika berhasil, tutup mode edit
            setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
            alert("Data berhasil diupdate!");
        } catch (error) {
            console.error("Update Error:", error);
            alert("Gagal mengupdate data. Cek terminal backend untuk detail error.");
        }
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
    const handleDeleteClick = (id: GridRowId) => async () => {
        if (window.confirm("Apakah Anda yakin ingin menghapus jabatan ini?")) {
            try {
                const response = await fetch(`http://localhost:3000/api/v1/jabatan/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) throw new Error("Gagal menghapus data");

                // Update UI lokal
                setRows(rows.filter((row) => row.id !== id));
            } catch (error) {
                alert("Gagal menghapus data.");
            }
        }
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
            editable: true,
            renderCell: (params) => (
                <span className="font-medium text-gray-800">{params.value}</span>
            )
        },
        {
            field: 'departemen',
            headerName: 'Departemen',
            flex: 1,
            minWidth: 150,
            editable: true,
            type: 'singleSelect',
            // Sekarang datanya dinamis!
            valueOptions: departemenOptions,
            renderCell: (params) => (
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {params.value}
                </span>
            )
        },
        {
            field: 'jumlah_karyawan',
            headerName: 'Jumlah Karyawan',
            flex: 1,
            minWidth: 150,
            align: 'center',
            headerAlign: 'center',
            editable: false,
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