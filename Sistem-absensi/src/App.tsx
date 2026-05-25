
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css'
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardIndex from './pages/dashboard/DashboardIndex';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Login';
import DataKarywanIndex from './pages/dashboard/karyawan/KaryawanIndex';
import RekapDataIndex from './pages/dashboard/rekapdata/RekapDataIndex';
import JadwalShiftIndex from './pages/dashboard/jadwalshift/JadwalShiftIndex';
import DepartemenIndex from './pages/dashboard/departemen/DepartemenIndex';
import AddKaryawan from './pages/dashboard/karyawan/AddKaryawan';
import AddDepartemen from './pages/dashboard/departemen/AddDepartemen';
import DetailDepartemen from './pages/dashboard/departemen/DetailDepartemen';
import DetailKaryawan from './pages/dashboard/karyawan/DetailKarywan';
import GajiTunjanganIndex from './pages/dashboard/gajitunjangan/GajiTunjanganIndex';
import JabatanIndex from './pages/dashboard/jabatan/JabatanIndex';
import AturGajiJabatan from './pages/dashboard/jabatan/AturGajiJabatan';
import AddJabatan from './pages/dashboard/jabatan/AddJabatan';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* halaman khusus login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            <Route path="/dashboard" element={<DashboardIndex />} />


            <Route path="/dashboard/data-karyawan" element={<DataKarywanIndex />} />
            <Route path="/dashboard/data-karyawan/tambah-karyawan" element={<AddKaryawan />} />
            <Route path="/dashboard/data-karyawan/:id" element={<DetailKaryawan />} />


            <Route path="/dashboard/departemen" element={<DepartemenIndex />} />
            <Route path="/dashboard/departemen/tambah-departemen" element={<AddDepartemen />} />
            <Route path="/dashboard/departemen/:id" element={<DetailDepartemen />} />


            <Route path="/dashboard/jabatan" element={<JabatanIndex/>} />
            <Route path="/dashboard/jabatan/tambah-jabatan" element={<AddJabatan />} />
            <Route path="/dashboard/jabatan/atur-gaji/:id" element={<AturGajiJabatan />} />



            <Route path="/dashboard/jadwal-shift" element={<JadwalShiftIndex />} />


            <Route path="/dashboard/rekap-data" element={<RekapDataIndex />} />


            <Route path="/dashboard/gaji-tunjangan" element={<GajiTunjanganIndex />} />


          </Route>
        </Route>


      </Routes>
    </BrowserRouter>
  );
}

export default App
