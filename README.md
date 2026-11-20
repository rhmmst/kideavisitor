# Kidea Visitor Management System (TK Kidea)

Sistem Informasi Manajemen Data Pengunjung & Pendaftaran Calon Murid untuk Sesi **Trial Class** di **TK Kidea (Preschool & Kindergarten)**. 

---

## 🎯 Fokus Sistem
Sistem ini disederhanakan secara spesifik untuk **dua modul utama**:
1. **Public Visitor Registration** : Formulir pendaftaran calon murid baru & penjadwalan Trial Class oleh orang tua.
2. **Admin Dashboard** : Panel pemantauan, pencarian, penyaringan, pengeditan, penghapusan, pembaruan status trial, dan ekspor data buku tamu ke Excel (.xlsx).

---

## 📋 Fitur yang Diterapkan

### 1. Beranda Sederhana & Bersih (Homepage)
- Header: Logo TK KIDEA, Home, Register Visitor, Admin Login.
- Hero Section:
  - **Judul**: Welcome to TK Kidea
  - **Subjudul**: Visitor Registration & Prospective Student Trial Class.
  - **Deskripsi**: Register your child for a school visit and Trial Class at TK Kidea.
  - **Tombol Utama**: Register Now
- Seluruh elemen berlebih (pilihan kategori tamu resmi, panduan keamanan, pencarian tiket pass, dll.) telah dihapus total.

### 2. Formulir Registrasi Calon Murid (`/register`)
Formulir hanya memuat bagian berikut:
- **A. Child Information**:
  - Children Name (Nama Murid)
  - Gender (Jenis Kelamin: Laki-laki / Perempuan)
  - Place of Birth (Tempat Lahir)
  - Date of Birth (Tanggal Lahir)
  - Age (Usia Terhitung Otomatis dari tanggal lahir)
  - Religion (Agama)
  - Address (Alamat Tempat Tinggal)
- **B. Parent Information**:
  - Father Name (Nama Ayah)
  - Mother Name (Nama Ibu)
  - Phone Number (Nomor WhatsApp)
  - Email Address (Alamat Email)
- **C. Class Category** (6 Pilihan):
  1. Mom & I Bright Baby
  2. Toddler
  3. Playgroup
  4. Preschool
  5. K1
  6. K2
- **D. School Session** (Otomatis bergantung kategori kelas):
  - *Mom & I Bright Baby*: Session 1 (09:00 - 10:00) | Session 2 (10:15 - 11:15)
  - *Toddler*: Session 1 (08:00 - 10:00) | Session 2 (10:15 - 12:15)
  - *Playgroup*: Session 1 (08:00 - 10:00) | Session 2 (10:15 - 12:15)
  - *Preschool*: Session 1 (08:00 - 10:00) | Session 2 (10:15 - 12:15)
  - *K1*: 08:00 - 11:45 (Jadwal tunggal tetap, tanpa pemilihan sesi)
  - *K2*: 08:00 - 12:00 (Jadwal tunggal tetap, tanpa pemilihan sesi)
- **E. Trial Class**:
  - Trial Schedule (Tanggal Trial Class) dengan pemilih tanggal (`min` hari ini, tanggal lampau tidak dapat dipilih).
- **Validasi & Pengiriman**:
  - Validasi ketat via **React Hook Form + Zod**.
  - Pencegahan pengiriman ganda (*duplicate submission prevention*).
  - Integrasi Supabase client (`src/services/visitorService.ts` & `src/lib/supabase.ts`) dengan fallback penyimpanan lokal yang aman.
  - Konfirmasi pengiriman sederhana tanpa QR code atau tiket pass rumit.

### 3. Admin Dashboard (`/admin/dashboard`)
- **Navigasi**: Dashboard, Visitor Data, Logout.
- **Statistik Ringkas**:
  - Total Visitors
  - Today's Registrations
  - Upcoming Trial Classes
- **Tabel Data Pengunjung**:
  - Kolom: Tgl Registrasi, Nama Murid, Nama Orang Tua, No. WhatsApp, Kategori Kelas, Sesi Sekolah, Tanggal Trial, Status Trial, Aksi.
  - **Fitur Lengkap**:
    - Pencarian cepat (nama anak, nama ayah/ibu, nomor telepon).
    - Filter kategori kelas (Semua, Mom & I, Toddler, Playgroup, Preschool, K1, K2).
    - Filter tanggal (berdasarkan tanggal trial / registrasi).
    - Modal lihat detail lengkap data calon murid & orang tua.
    - Modal edit data calon murid & jadwal.
    - Modal hapus data dengan konfirmasi aman.
    - Pembaruan status Trial Class (*Scheduled*, *Attended*, *Rescheduled*, *Cancelled*).
    - **Ekspor Excel** (.xlsx) dengan styling rapi khas TK Kidea via **ExcelJS**.

---

## 🛠️ Konfigurasi Supabase (Opsional)
Untuk menghubungkan dengan database Supabase Anda, buat file `.env` di direktori utama:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
*Tabel yang digunakan:* `visitors`. Jika `.env` belum diisi, sistem otomatis menggunakan penyimpanan lokal (*local storage fallback*) sehingga seluruh alur registrasi dan dashboard tetap berjalan 100%.

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

1. **Instal Ketergantungan**:
   ```bash
   npm install
   ```

2. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```
   Buka di peramban: `http://localhost:5173`

3. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

---

## 🔐 Akun Demo Admin
- **Email**: `admin@kidea.sch.id`
- **Kata Sandi**: `kidea2026`
*(Tersedia tombol satu-klik "Isi Otomatis Akun Demo" pada halaman login)*
