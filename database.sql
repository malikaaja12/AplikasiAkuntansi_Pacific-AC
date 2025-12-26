-- Database: accounting_app

CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type ENUM('Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban') NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proof_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    group_name VARCHAR(255),
    account_name VARCHAR(255),
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receivables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proof_no_journal VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    purchase_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('active', 'paid') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receivable_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receivable_id INT,
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    proof_no_journal VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (receivable_id) REFERENCES receivables(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    initial_stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50),
    date DATE NOT NULL,
    type ENUM('masuk', 'keluar') NOT NULL,
    quantity INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_code) REFERENCES stock_items(code) ON DELETE CASCADE
);

-- Default Accounts
INSERT IGNORE INTO accounts (name, type) VALUES
('Kas', 'Aset'),
('Bank', 'Aset'),
('Kas Kecil', 'Aset'),
('Piutang Karyawan', 'Aset'),
('Piutang Lainnya', 'Aset'),
('Piutang Usaha', 'Aset'),
('Persediaan Sparepart', 'Aset'),
('Perlengkapan Kantor', 'Aset'),
('Peralatan Usaha', 'Aset'),
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
('Tim Yudi'),
('Tim Aziz'),
('Tim Sukma'),
('Tim Rfaid'),
('Tim Arya'),
('Tim Dafa'),
('Tim Farel'),
('Tim P.Deni'),
('Proyek A'),
('Operasional Kantor');
