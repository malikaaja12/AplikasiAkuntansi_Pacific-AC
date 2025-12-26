import { state } from '../state.js';
import { utils } from '../utils.js';
import { storage } from '../storage.js';

export function renderStockBarangTab() {
    const container = document.getElementById("stockBarang-tab");
    const itemOptions = getStockItemOptions();
    const defaultDate = new Date(state.currentMonth + "-02").toISOString().split("T")[0];
    const { jurnalStokRows } = renderJurnalStokRows();

    container.innerHTML = `
        <section class="bg-white p-6 rounded-lg shadow-sm">
            <h2 class="text-xl font-semibold mb-4">Manajemen Stok Barang</h2>
            
            <div class="mb-4 border-b border-gray-200">
                <nav class="flex -mb-px" aria-label="Tabs">
                    <button id="tab-btn-jurnalStok" class="stock-subtab-button active-subtab border-b-2 font-medium text-sm px-4 py-3 text-blue-600 border-blue-600" data-tab="jurnalStok">
                        <i class="fas fa-book-open mr-2"></i>Jurnal Stok
                    </button>
                    <button id="tab-btn-barangMasuk" class="stock-subtab-button border-b-2 font-medium text-sm px-4 py-3 text-gray-500 hover:text-gray-700 hover:border-gray-300" data-tab="barangMasuk">
                        <i class="fas fa-arrow-down mr-2"></i>Data Barang Masuk
                    </button>
                    <button id="tab-btn-barangKeluar" class="stock-subtab-button border-b-2 font-medium text-sm px-4 py-3 text-gray-500 hover:text-gray-700 hover:border-gray-300" data-tab="barangKeluar">
                        <i class="fas fa-arrow-up mr-2"></i>Data Barang Keluar
                    </button>
                </nav>
            </div>

            <div id="jurnalStok-subtab" class="stock-subtab-content">
                <h3 class="text-lg font-semibold mb-3">Tambah Barang Baru</h3>
                <form id="add-new-stock-item-form" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                    <div>
                        <label for="new-item-kode" class="block text-sm font-medium text-gray-700">Kode Barang</label>
                        <input type="text" id="new-item-kode" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                    </div>
                    <div>
                        <label for="new-item-nama" class="block text-sm font-medium text-gray-700">Nama Barang</label>
                        <input type="text" id="new-item-nama" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                    </div>
                    <div>
                        <label for="new-item-stok-awal" class="block text-sm font-medium text-gray-700">Stok Awal Periode</label>
                        <input type="number" id="new-item-stok-awal" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" min="0" value="0" required>
                    </div>
                    <div class="self-end">
                        <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>Tambah Barang</button>
                    </div>
                </form>

                <h3 class="text-lg font-semibold mb-3">Jurnal Stok Periode: ${utils.formatMonth(state.currentMonth)}</h3>
                <div class="overflow-x-auto border rounded-md">
                    <table id="jurnal-stok-table" class="min-w-full">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                                <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Stok Awal</th>
                                <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Masuk</th>
                                <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Keluar</th>
                                <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Stok Akhir</th>
                                <th class="p-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>${jurnalStokRows}</tbody>
                    </table>
                </div>
            </div>

            <div id="barangMasuk-subtab" class="stock-subtab-content hidden">
              <h3 class="text-lg font-semibold mb-3">Input Data Barang Masuk</h3>
                <form id="add-stock-masuk-form" class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border items-end">
                    <div>
                        <label for="stock-tanggal-masuk" class="block text-sm font-medium text-gray-700">Tanggal</label>
                        <input type="date" id="stock-tanggal-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${defaultDate}" required>
                    </div>
                    <div>
                        <label for="stock-kode-masuk" class="block text-sm font-medium text-gray-700">Kode Barang</label>
                        <select id="stock-kode-masuk" class="stock-kode-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" data-formtype="masuk" required>
                            <option value="">-- Pilih --</option>
                            ${itemOptions}
                        </select>
                    </div>
                    <div>
                        <label for="stock-nama-masuk" class="block text-sm font-medium text-gray-700">Nama Barang</label>
                        <input type="text" id="stock-nama-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100" readonly>
                    </div>
                    <div>
                        <label for="stock-jumlah-masuk" class="block text-sm font-medium text-gray-700">Jumlah</label>
                        <input type="number" id="stock-jumlah-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" min="1" required>
                    </div>
                     <div>
                        <label for="stock-keterangan-masuk" class="block text-sm font-medium text-gray-700">Keterangan</label>
                        <input type="text" id="stock-keterangan-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ket...">
                    </div>
                    <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700" title="Simpan"><i class="fas fa-save"></i></button>
                </form>
                
                <h4 class="text-lg font-semibold mt-8 mb-3">Riwayat Barang Masuk Periode Ini</h4>
                <div class="overflow-x-auto border rounded-md">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                                <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                                <th class="p-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="stock-masuk-history-body"></tbody>
                    </table>
                </div>
            </div>

            <div id="barangKeluar-subtab" class="stock-subtab-content hidden">
               <h3 class="text-lg font-semibold mb-3">Input Data Barang Keluar</h3>
                <form id="add-stock-keluar-form" class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border items-end">
                     <div>
                        <label for="stock-tanggal-keluar" class="block text-sm font-medium text-gray-700">Tanggal</label>
                        <input type="date" id="stock-tanggal-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${defaultDate}" required>
                    </div>
                    <div>
                        <label for="stock-kode-keluar" class="block text-sm font-medium text-gray-700">Kode Barang</label>
                        <select id="stock-kode-keluar" class="stock-kode-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" data-formtype="keluar" required>
                            <option value="">-- Pilih --</option>
                            ${itemOptions}
                        </select>
                    </div>
                    <div>
                        <label for="stock-nama-keluar" class="block text-sm font-medium text-gray-700">Nama Barang</label>
                        <input type="text" id="stock-nama-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100" readonly>
                    </div>
                    <div>
                        <label for="stock-jumlah-keluar" class="block text-sm font-medium text-gray-700">Jumlah</label>
                        <input type="number" id="stock-jumlah-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" min="1" required>
                    </div>
                     <div>
                        <label for="stock-keterangan-keluar" class="block text-sm font-medium text-gray-700">Keterangan</label>
                        <input type="text" id="stock-keterangan-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ket...">
                    </div>
                    <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700" title="Simpan"><i class="fas fa-save"></i></button>
                </form>
                
                <h4 class="text-lg font-semibold mt-8 mb-3">Riwayat Barang Keluar Periode Ini</h4>
                <div class="overflow-x-auto border rounded-md">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                                <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                                <th class="p-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="stock-keluar-history-body"></tbody>
                    </table>
                </div>
            </div>
        </section>
    `;

    renderHistoryTables();
    attachEventListeners();
}

function calculateStockLevelsLocal() {
    return storage.calculateStockLevels(state.stock.items, state.stock.transactions);
}

function renderJurnalStokRows() {
    const stockLevels = calculateStockLevelsLocal();
    let jurnalStokRows = Object.entries(stockLevels)
        .map(([kode, data]) => {
            return `
                <tr class="hover:bg-gray-50">
                    <td class="p-2 border-b text-sm">${kode}</td>
                    <td class="p-2 border-b text-sm">${data.nama}</td>
                    <td class="p-2 border-b text-sm text-right">${data.stokAwal}</td>
                    <td class="p-2 border-b text-sm text-right text-green-600">${data.masuk}</td>
                    <td class="p-2 border-b text-sm text-right text-red-600">${data.keluar}</td>
                    <td class="p-2 border-b text-sm text-right font-bold">${data.stokAkhir}</td>
                    <td class="p-2 border-b text-center">
                        <button data-action="deleteItem" data-kode="${kode}" class="text-gray-400 hover:text-red-600 px-2" title="Hapus Item"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        })
        .join("");

    if (Object.keys(stockLevels).length === 0) {
        jurnalStokRows = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Belum ada barang yang didaftarkan.</td></tr>`;
    }
    return { jurnalStokRows };
}

function getStockItemOptions() {
    return state.stock.items
        .sort((a, b) => a.kode.localeCompare(b.kode))
        .map((item) => `<option value="${item.kode}">${item.kode} - ${item.nama}</option>`)
        .join("");
}

function renderHistoryTables() {
    const allTransactions = state.stock.transactions;
    const getItemName = (kode) => state.stock.items.find((i) => i.kode === kode)?.nama || "N/A";

    const masukTableRows = allTransactions
        .filter((t) => t.tipe === "masuk")
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
        .map((tx) => `
            <tr class="hover:bg-gray-50">
                <td class="p-2 border-b text-sm">${tx.tanggal}</td>
                <td class="p-2 border-b text-sm">${tx.kode}</td>
                <td class="p-2 border-b text-sm">${getItemName(tx.kode)}</td>
                <td class="p-2 border-b text-sm text-right">${tx.jumlah}</td>
                <td class="p-2 border-b text-sm">${tx.keterangan || ""}</td>
                <td class="p-2 border-b text-center">
                    <button data-action="deleteTrx" data-id="${tx.id}" data-type="barangMasuk" class="text-gray-400 hover:text-red-600 px-2" title="Hapus Transaksi">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");

    const keluarTableRows = allTransactions
        .filter((t) => t.tipe === "keluar")
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
        .map((tx) => `
            <tr class="hover:bg-gray-50">
                <td class="p-2 border-b text-sm">${tx.tanggal}</td>
                <td class="p-2 border-b text-sm">${tx.kode}</td>
                <td class="p-2 border-b text-sm">${getItemName(tx.kode)}</td>
                <td class="p-2 border-b text-sm text-right">${tx.jumlah}</td>
                <td class="p-2 border-b text-sm">${tx.keterangan || ""}</td>
                <td class="p-2 border-b text-center">
                    <button data-action="deleteTrx" data-id="${tx.id}" data-type="barangKeluar" class="text-gray-400 hover:text-red-600 px-2" title="Hapus Transaksi">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");

    document.getElementById("stock-masuk-history-body").innerHTML = masukTableRows || `<tr><td colspan="6" class="text-center py-4 text-gray-500">Belum ada riwayat.</td></tr>`;
    document.getElementById("stock-keluar-history-body").innerHTML = keluarTableRows || `<tr><td colspan="6" class="text-center py-4 text-gray-500">Belum ada riwayat.</td></tr>`;
}

function attachEventListeners() {
    // Tabs
    const tabButtons = ["jurnalStok", "barangMasuk", "barangKeluar"];
    tabButtons.forEach(tabName => {
        document.getElementById(`tab-btn-${tabName}`).addEventListener("click", (e) => {
            changeStockSubTab(tabName, e.currentTarget);
        });
    });

    // Forms
    document.getElementById("add-new-stock-item-form").addEventListener("submit", (e) => {
        e.preventDefault();
        addNewStockItem();
    });
    document.getElementById("add-stock-masuk-form").addEventListener("submit", (e) => {
        e.preventDefault();
        addStockMasuk();
    });
    document.getElementById("add-stock-keluar-form").addEventListener("submit", (e) => {
        e.preventDefault();
        addStockKeluar();
    });

    // Auto-fill names
    document.querySelectorAll(".stock-kode-input").forEach((input) => {
        input.addEventListener("change", (e) => {
            autoFillNamaBarang(e.target.dataset.formtype);
        });
    });

    // Delegated delete buttons
    document.getElementById("jurnal-stok-table").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (btn && btn.dataset.action === "deleteItem") {
            deleteStockItem(btn.dataset.kode);
        }
    });

    const handleDeleteTrx = (e) => {
        const btn = e.target.closest("button");
        if (btn && btn.dataset.action === "deleteTrx") {
            deleteStockTransaction(parseInt(btn.dataset.id), btn.dataset.type);
        }
    };
    document.getElementById("stock-masuk-history-body").addEventListener("click", handleDeleteTrx);
    document.getElementById("stock-keluar-history-body").addEventListener("click", handleDeleteTrx);
}

function changeStockSubTab(tabName, element) {
    document.querySelectorAll(".stock-subtab-content").forEach((tab) => tab.classList.add("hidden"));
    document.getElementById(`${tabName}-subtab`).classList.remove("hidden");

    document.querySelectorAll(".stock-subtab-button").forEach((button) => {
        button.classList.remove("active-subtab", "text-blue-600", "border-blue-600");
        button.classList.add("text-gray-500");
    });
    element.classList.add("active-subtab", "text-blue-600", "border-blue-600");
    element.classList.remove("text-gray-500");
}

function autoFillNamaBarang(formType) {
    try {
        const kode = document.getElementById(`stock-kode-${formType}`).value;
        const item = state.stock.items.find((i) => i.kode === kode);
        const namaInput = document.getElementById(`stock-nama-${formType}`);
        if (item) {
            namaInput.value = item.nama;
        } else {
            namaInput.value = "";
        }
    } catch (e) {
        console.error("Error autoFillNamaBarang:", e);
    }
}

function addNewStockItem() {
    const kode = document.getElementById("new-item-kode").value.trim().toUpperCase();
    const nama = document.getElementById("new-item-nama").value.trim();
    const stokAwal = parseFloat(document.getElementById("new-item-stok-awal").value) || 0;

    if (!kode || !nama) {
        utils.showModal("Peringatan", "Kode dan Nama Barang harus diisi.");
        return;
    }

    if (state.stock.items.some((item) => item.kode === kode)) {
        utils.showModal("Peringatan", "Kode Barang sudah ada. Gunakan kode unik.");
        return;
    }

    state.stock.items.push({ id: Date.now(), kode, nama, stokAwal });
    storage.saveData();
    renderStockBarangTab();
    utils.showModal("Sukses", `Barang '${nama}' berhasil ditambahkan.`);
}

function deleteStockItem(kode) {
    const hasTransactions = state.stock.transactions.some((trx) => trx.kode === kode);
    let message = `Yakin ingin menghapus barang dengan kode '${kode}'? Tindakan ini tidak dapat dibatalkan.`;

    if (hasTransactions) {
        message = `Barang dengan kode '${kode}' memiliki riwayat transaksi. Menghapus barang ini akan **menghapus SEMUA riwayat transaksi (masuk/keluar) yang terkait**. Yakin ingin melanjutkan?`;
    }

    utils.showModal("Konfirmasi Hapus", message, [
        {
            text: "Ya, Hapus",
            class: "bg-red-600 hover:bg-red-700",
            callback: () => {
                state.stock.items = state.stock.items.filter((item) => item.kode !== kode);
                if (hasTransactions) {
                    state.stock.transactions = state.stock.transactions.filter((trx) => trx.kode !== kode);
                }
                storage.saveData();
                renderStockBarangTab();
                utils.closeModal();
            },
        },
        {
            text: "Batal",
            class: "bg-gray-600 hover:bg-gray-700",
            callback: () => utils.closeModal(),
        },
    ]);
}

function addStockMasuk() {
    const tanggal = document.getElementById("stock-tanggal-masuk").value;
    const kode = document.getElementById("stock-kode-masuk").value;
    const jumlah = parseFloat(document.getElementById("stock-jumlah-masuk").value);
    const keterangan = document.getElementById("stock-keterangan-masuk").value.trim();

    if (!tanggal || !kode || !jumlah || jumlah <= 0) {
        utils.showModal("Peringatan", "Harap isi Tanggal, Kode Barang, dan Jumlah (lebih dari 0) dengan benar.");
        return;
    }

    if (tanggal.slice(0, 7) !== state.currentMonth) {
        utils.showModal("Peringatan", `Tanggal transaksi harus berada dalam periode aktif saat ini (${utils.formatMonth(state.currentMonth)}).`);
        return;
    }

    state.stock.transactions.push({
        id: Date.now(),
        tanggal,
        kode,
        tipe: "masuk",
        jumlah,
        keterangan,
    });

    storage.saveData();
    document.getElementById("add-stock-masuk-form").reset();
    renderStockBarangTab();
    changeStockSubTab("barangMasuk", document.getElementById("tab-btn-barangMasuk"));
    utils.showModal("Sukses", "Data barang masuk berhasil disimpan.");
}

function addStockKeluar() {
    const tanggal = document.getElementById("stock-tanggal-keluar").value;
    const kode = document.getElementById("stock-kode-keluar").value;
    const jumlah = parseFloat(document.getElementById("stock-jumlah-keluar").value);
    const keterangan = document.getElementById("stock-keterangan-keluar").value.trim();

    if (!tanggal || !kode || !jumlah || jumlah <= 0) {
        utils.showModal("Peringatan", "Harap isi Tanggal, Kode Barang, dan Jumlah (lebih dari 0) dengan benar.");
        return;
    }

    if (tanggal.slice(0, 7) !== state.currentMonth) {
        utils.showModal("Peringatan", `Tanggal transaksi harus berada dalam periode aktif saat ini (${utils.formatMonth(state.currentMonth)}).`);
        return;
    }

    const stockLevels = calculateStockLevelsLocal();
    const itemStok = stockLevels[kode];
    if (!itemStok || itemStok.stokAkhir < jumlah) {
        utils.showModal("Peringatan", `Stok tidak mencukupi. Stok akhir untuk '${kode}' hanya ${itemStok ? itemStok.stokAkhir : 0}.`);
        return;
    }

    state.stock.transactions.push({
        id: Date.now(),
        tanggal,
        kode,
        tipe: "keluar",
        jumlah,
        keterangan,
    });

    storage.saveData();
    document.getElementById("add-stock-keluar-form").reset();
    renderStockBarangTab();
    changeStockSubTab("barangKeluar", document.getElementById("tab-btn-barangKeluar"));
    utils.showModal("Sukses", "Data barang keluar berhasil disimpan.");
}

function deleteStockTransaction(id, subTabToReopen = "jurnalStok") {
    const tx = state.stock.transactions.find((t) => t.id === id);
    if (!tx) return;

    if (tx.tipe === "masuk") {
        const kode = tx.kode;
        const newTransactions = state.stock.transactions.filter((t) => t.id !== id);
        const newStockLevels = storage.calculateStockLevels(state.stock.items, newTransactions);

        if (newStockLevels[kode] && newStockLevels[kode].stokAkhir < 0) {
            utils.showModal(
                "Peringatan",
                `Tidak dapat menghapus transaksi 'masuk' ini karena akan menyebabkan stok akhir untuk '${kode}' menjadi negatif (${newStockLevels[kode].stokAkhir}).`
            );
            return;
        }
    }

    utils.showModal("Konfirmasi Hapus", `Yakin ingin menghapus transaksi ini? (Tgl: ${tx.tanggal}, Kode: ${tx.kode}, Jml: ${tx.jumlah})`, [
        {
            text: "Ya, Hapus",
            class: "bg-red-600 hover:bg-red-700",
            callback: () => {
                state.stock.transactions = state.stock.transactions.filter((t) => t.id !== id);
                storage.saveData();
                renderStockBarangTab();
                changeStockSubTab(subTabToReopen, document.getElementById(`tab-btn-${subTabToReopen}`));
                utils.closeModal();
            },
        },
        {
            text: "Batal",
            class: "bg-gray-600 hover:bg-gray-700",
            callback: () => utils.closeModal(),
        },
    ]);
}
