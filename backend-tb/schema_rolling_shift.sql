-- =========================================================================
-- SQL MIGRATION: DYNAMIC ROLLING SHIFT AUTO-SCHEDULER
-- Eksekusi skrip ini di SQL Editor Supabase Anda
-- =========================================================================

-- 1. Tabel Header Pola Rotasi Shift
CREATE TABLE IF NOT EXISTS pola_rotasi_shift (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pola VARCHAR(100) NOT NULL,
    jumlah_hari_siklus INT NOT NULL DEFAULT 7,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Detail Pola (Urutan Shift per Hari dalam Siklus)
-- Catatan: shift_id bertipe BIGINT sesuai dengan tipe id pada tabel shifts
CREATE TABLE IF NOT EXISTS detail_pola_rotasi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pola_id UUID REFERENCES pola_rotasi_shift(id) ON DELETE CASCADE,
    urutan_hari INT NOT NULL,
    shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL, -- BIGINT (NULL berarti Libur/OFF)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_pola_urutan UNIQUE(pola_id, urutan_hari)
);

-- 3. Tambahkan kolom ke tabel pegawai
ALTER TABLE pegawai 
ADD COLUMN IF NOT EXISTS pola_rotasi_id UUID REFERENCES pola_rotasi_shift(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tanggal_mulai_pola DATE;
