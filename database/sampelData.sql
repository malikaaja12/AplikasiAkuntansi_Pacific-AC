USE pacific_ac;

-- Database: pacific_ac
-- Default Accounts
INSERT IGNORE INTO accounts (name, type) VALUES
('Kas Proyek', 'Aset'),
('Kas Uatama','Aset'),
('Bank', 'Aset'),
('Kas Kecil', 'Aset'),
('Kas Besar','Aset'),
('Piutang Lainnya', 'Aset'),
('Piutang Usaha', 'Aset'),
('Persediaan Sparepart', 'Aset'),
('Perlengkapan Kantor', 'Aset'),
('Peralatan Usaha', 'Aset'),
('Piutang Karyawan', 'Liabilitas'),
('Utang Usaha', 'Liabilitas'),
('Utang Bank', 'Liabilitas'),
('Modal', 'Ekuitas'),
('Pendapatan Jasa', 'Pendapatan'),
('Pendapatan Penjualan', 'Pendapatan'),
('Beban Gaji', 'Beban'),
('Beban Transportasi', 'Beban'),
('Beban Sewa', 'Beban'),
('Beban Lainnya', 'Beban');

-- Default Groups
INSERT IGNORE INTO transaction_groups (name) VALUES
('Tim Rizal')
('Tim Yudi'),
('Tim Aziz'),
('Tim Sukma'),
('Tim Rafid'),
('Tim Arya'),
('Tim Dafa'),
('Tim Farel'),
('Tim P.Deni'),
('Proyek A'),
('Proyek B'),
('Operasional Kantor');

-- Default Stock Items
INSERT IGNORE INTO stock_items (code, name, initial_stock) VALUES
('SP001', 'Sparepart A', 100),
('SP002', 'Sparepart B', 150),
('SP003', 'Sparepart C', 200),
('SP004', 'Sparepart D', 250),
('SP005', 'Sparepart E', 300);
