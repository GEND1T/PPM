import { DataGrid, type GridColDef, type GridRowModesModel } from "@mui/x-data-grid";
import { useState } from "react";



export interface RekapItems{
    id: string;
    nama: string;
    jabatan: string;
    shift: string;
    tepatwaktu: string | number;
    terlambat: string |  number;
    izin: string | number;
}

export interface TabelRekapDataProps{
    data: RekapItems[];
}


export default function TabelRekapData({data: initialData} : TabelRekapDataProps ) {

    // State untuk menyimpan data baris dan mode edit dari MUI DataGrid
    const [rows] = useState<RekapItems[]>(initialData);
    const [] = useState<GridRowModesModel>({});

    // --- FUNGSI-FUNGSI AKSI ---

    // --- FUNGSI UPDATE DATA KE STATE ---
    // const processRowUpdate = (newRow: GridRowModel) => {
    //     const updatedRow = {...newRow } as RekapItems;
    //     setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));

    //     console.log("Data berhasil diubah : ", updatedRow);
    //     return updatedRow;
    // };

    //Edit Baris (Row Editing)
    // const handleRowModesModelChange = (newRowModesModel : GridRowModesModel) => {
    //     setRowModesModel(newRowModesModel);
    // };


     // --- DEFINISI KOLOM ---
     const columns : GridColDef[] = [
        {field: 'id', headerName: "id",flex: 1 ,width: 70},
        {
            field: 'nama', 
            headerName: "Nama",
           flex: 1 ,
           width: 70
        },
        {field: 'jabatan', headerName: "Jabatan",flex: 1 ,width: 70},
        {field: 'shift', headerName: "Shift",flex: 1 ,width: 70},
        {field: 'tepatwaktu', headerName: "Tepat Waktu",flex: 1 ,width: 70},
        {field: 'terlambat', headerName: "Terlambat",flex: 1 ,width: 70},
     ]; 

    return(
        <div className="w-full">
            <DataGrid
            autoHeight
            showToolbar
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10, 20]}
            />

        </div>
    )
}