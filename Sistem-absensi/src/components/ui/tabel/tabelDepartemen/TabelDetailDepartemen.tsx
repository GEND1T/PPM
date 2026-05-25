
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

// Mendefinisikan bentuk data yang akan diterima dari luar (props)
interface TabelDetailDepartemenProps {
    data: any[]; // Menerima array data jabatan
}

export default function TabelDetailDepartemen({ data }: TabelDetailDepartemenProps) {
    
    // Pindahkan kolom ke sini
    const columns: GridColDef[] = [
        { field: 'jabatan', headerName: 'Jabatan', flex: 1, minWidth: 150 },
        { field: 'jumlah_karyawan', headerName: 'Jumlah Karyawan', flex: 1, minWidth: 150 },
    ];

    return (
        <DataGrid
            autoHeight
            rows={data} // Menggunakan data dari props
            columns={columns}
            initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 5 } },
            }}
            pageSizeOptions={[5, 10]}
            disableRowSelectionOnClick
            sx={{
                border: '1px solid #e5e7eb',
                '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f9fafb',
                    color: 'black',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #9ca3af',
                },
            }}
        />
    );
}