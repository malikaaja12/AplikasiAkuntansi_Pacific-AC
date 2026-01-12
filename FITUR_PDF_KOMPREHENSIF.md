# Fitur PDF Komprehensif - Dokumentasi

## Deskripsi
Fitur baru yang menggabungkan **Chart Laba Rugi**, **Ringkasan Laba Rugi**, dan **Chart Arus Kas** dalam satu file PDF dengan pemisahan yang jelas per halaman.

## Struktur PDF

### Halaman 1: Tren Laba Rugi Bulanan
- **Chart Line**: Menampilkan tren laba/rugi bersih per bulan
- **Tabel Data Bulanan**: Rincian pendapatan, beban, dan laba bersih per bulan
- Visualisasi yang mudah dibaca untuk melihat performa bisnis dari waktu ke waktu

### Halaman 2: Ringkasan Laba Rugi
- **Pendapatan**: Daftar semua kategori pendapatan dengan total
- **Beban**: Daftar semua kategori beban dengan total
- **Laba Bersih**: Hasil akhir dengan highlight warna (hijau untuk laba, merah untuk rugi)

### Halaman 3: Laporan Arus Kas
- **Arus Kas Operasi**: Transaksi kas dari aktivitas operasional
- **Arus Kas Investasi**: Transaksi kas dari aktivitas investasi
- **Arus Kas Pendanaan**: Transaksi kas dari aktivitas pendanaan
- **Perubahan Bersih Kas**: Total perubahan kas dengan highlight warna

### Halaman 4 (Opsional): Visualisasi Arus Kas
- **Chart Bar**: Grafik batang untuk membandingkan ketiga aktivitas arus kas
- Hanya muncul jika ada data arus kas

## Cara Menggunakan

1. Buka aplikasi akuntansi
2. Navigasi ke tab **Pengaturan**
3. Klik tombol **"Download Laporan Komprehensif (Baru!)"** (tombol dengan background biru)
4. PDF akan otomatis tergenerate dan didownload dengan nama: `Laporan_Keuangan_Komprehensif_[YYYY-MM].pdf`

## Perbedaan dengan PDF Standar

| Fitur | PDF Standar | PDF Komprehensif |
|-------|-------------|------------------|
| Chart Laba Rugi | ✅ | ✅ |
| Ringkasan Laba Rugi | ✅ | ✅ (Lebih detail) |
| Arus Kas | ❌ | ✅ |
| Chart Arus Kas | ❌ | ✅ |
| Tabel Data Bulanan | ❌ | ✅ |
| Jurnal Detail | ✅ | ❌ |
| Pie Chart Beban | ✅ | ❌ |

## Fitur Teknis

- **Auto-pagination**: Halaman baru otomatis dibuat jika konten terlalu panjang
- **Color coding**: Warna berbeda untuk setiap section (biru, kuning, ungu)
- **Responsive layout**: Tabel dan chart menyesuaikan dengan ukuran halaman
- **Professional formatting**: Font, spacing, dan alignment yang konsisten

## File yang Dimodifikasi

1. `js/services/pdf.js` - Menambahkan fungsi `generateComprehensiveFinancialPDF()`
2. `js/modules/pengaturan.js` - Menambahkan tombol dan event listener baru

## Catatan

- PDF ini menggunakan library yang sama (jsPDF, Chart.js) dengan PDF standar
- Semua data diambil dari `state.jurnals` dan `state.settings.akuns`
- Kategori arus kas ditentukan secara otomatis berdasarkan nama akun
