import { state } from '../state.js';
import { utils } from '../utils.js';
import { storage } from '../storage.js';
import { pdfService } from '../services/pdf.js';
import { renderAll } from '../app.js'; // Need to import this to redraw on reset

export function renderPengaturanTab() {
    const container = document.getElementById("pengaturan-tab");
    container.innerHTML = `
        <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-lg shadow-sm">
                <h3 class="text-lg font-semibold mb-2">Manajemen Kategori</h3>
                <div class="space-y-6">
                    <div>
                        <h4 class="font-medium mb-2">Daftar Akun</h4>
                        <form id="add-akun-form" class="flex gap-2 mb-4">
                            <input type="text" id="new-akun-name" placeholder="Nama Akun Baru" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm" required>
                            <select id="new-akun-tipe" class="rounded-md border-gray-300 shadow-sm"> <option value="Aset">Aset</option><option value="Liabilitas">Liabilitas</option><option value="Ekuitas">Ekuitas</option><option value="Pendapatan">Pendapatan</option><option value="Beban">Beban</option> </select>
                            <button type="submit" class="py-2 px-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus"></i></button>
                        </form>
                        <ul id="akun-list" class="space-y-2 max-h-40 overflow-y-auto pr-2"></ul>
                    </div>
                    <div>
                        <h4 class="font-medium mb-2">Daftar Kelompok</h4>
                        <form id="add-kelompok-form" class="flex gap-2 mb-4">
                            <input type="text" id="new-kelompok-name" placeholder="Nama Kelompok Baru" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm" required>
                            <button type="submit" class="py-2 px-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus"></i></button>
                        </form>
                        <ul id="kelompok-list" class="space-y-2 max-h-40 overflow-y-auto pr-2"></ul>
                    </div>
                </div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-sm">
                    <h3 class="text-lg font-semibold mb-2">Manajemen Data</h3>
                    <div class="mb-4 bg-gray-100 p-3 rounded-md text-center">
                    <p class="text-sm text-gray-600">Periode Data Aktif:</p> <p class="font-bold text-gray-800">${utils.formatMonth(state.currentMonth)}</p>
                    </div>
                    <div class="space-y-4">
                        <button id="btn-save-current" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-save mr-3 text-lg text-blue-500"></i> <div> <span>Simpan Data Bulan Ini</span> <span class="block text-xs text-gray-500">Simpan progres untuk periode aktif saat ini.</span> </div> </button>
                        <button id="btn-load-month" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-folder-open mr-3 text-lg text-yellow-500"></i> <div> <span>Muat Data Bulan Lain</span> <span class="block text-xs text-gray-500">Buka dan kelola data dari periode lain.</span> </div> </button>
                        <button id="btn-gen-pdf" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-file-pdf mr-3 text-lg text-red-500"></i> <div> <span>Download Laporan PDF (Standar)</span> <span class="block text-xs text-gray-500">Buat file PDF standar untuk periode aktif.</span> </div> </button>
                        <button id="btn-gen-category-pdf" class="w-full text-left flex items-center py-3 px-4 border border-purple-300 text-purple-700 text-sm font-medium rounded-md hover:bg-purple-50 bg-purple-50"> <i class="fas fa-layer-group mr-3 text-lg text-purple-600"></i> <div> <span>Download Laporan Per Kategori</span> <span class="block text-xs text-gray-500">Pisahkan Residential & Project dalam satu PDF.</span> </div> </button>
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                        <button id="btn-import" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-upload mr-3 text-lg text-green-500"></i> <div> <span>Impor Data</span> <span class="block text-xs text-gray-500">Muat data dari file.</span> </div> </button>
                        <button id="btn-export" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-download mr-3 text-lg text-indigo-500"></i> <div> <span>Ekspor Data</span> <span class="block text-xs text-gray-500">Simpan semua data ke file.</span> </div> </button>
                    </div>
                    <button id="btn-reset" class="w-full text-left flex items-center py-3 px-4 border border-red-200 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"> <i class="fas fa-trash-alt mr-3 text-lg"></i> <div> <span>Reset Data Bulan Ini</span> <span class="block text-xs text-gray-500">Hapus semua transaksi untuk periode aktif.</span> </div> </button>
                    </div>
            </div>
        </section>`;

    renderSettingLists();
    attachSettingsListeners();
}

function renderSettingLists() {
    const akunList = document.getElementById("akun-list");
    if (!akunList) return;
    akunList.innerHTML = "";
    state.settings.akuns
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((akun) => {
            akunList.innerHTML += `<li class="flex justify-between items-center bg-gray-50 p-2 rounded-md"><div>${akun.name}<span class="text-xs text-gray-500 ml-2 px-1.5 py-0.5 bg-gray-200 rounded-full">${akun.type}</span></div><button data-action="deleteAkun" data-name="${akun.name}" class="text-gray-400 hover:text-red-500 text-xs"><i class="fas fa-times-circle"></i></button></li>`;
        });

    const kelompokList = document.getElementById("kelompok-list");
    kelompokList.innerHTML = "";
    state.settings.kelompoks.sort().forEach((k) => {
        kelompokList.innerHTML += `<li class="flex justify-between items-center bg-gray-50 p-2 rounded-md"><span>${k}</span><button data-action="deleteKelompok" data-name="${k}" class="text-gray-400 hover:text-red-500 text-xs"><i class="fas fa-times-circle"></i></button></li>`;
    });
}

function attachSettingsListeners() {
    document.getElementById("add-akun-form").addEventListener("submit", (e) => {
        e.preventDefault();
        addAkun();
    });
    document.getElementById("add-kelompok-form").addEventListener("submit", (e) => {
        e.preventDefault();
        addKelompok();
    });

    // Delegation for delete buttons
    document.getElementById("akun-list").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (btn && btn.dataset.action === "deleteAkun") {
            deleteAkun(btn.dataset.name);
        }
    });
    document.getElementById("kelompok-list").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (btn && btn.dataset.action === "deleteKelompok") {
            deleteKelompok(btn.dataset.name);
        }
    });

    document.getElementById("btn-save-current").addEventListener("click", () => storage.saveDataForCurrentMonth());
    document.getElementById("btn-load-month").addEventListener("click", () => showLoadModal());
    document.getElementById("btn-gen-pdf").addEventListener("click", () => pdfService.generatePDF());
    document.getElementById("btn-gen-category-pdf").addEventListener("click", () => pdfService.generateCategoryPDF());
    document.getElementById("btn-import").addEventListener("click", () => storage.importData());
    document.getElementById("btn-export").addEventListener("click", () => storage.exportData());
    document.getElementById("btn-reset").addEventListener("click", () => resetData());
}

function addAkun() {
    const nameInput = document.getElementById("new-akun-name");
    const typeInput = document.getElementById("new-akun-tipe");
    const name = nameInput.value.trim();
    if (!name) return;
    if (state.settings.akuns.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
        utils.showModal("Peringatan", "Nama akun sudah ada.");
        return;
    }
    state.settings.akuns.push({ name, type: typeInput.value });
    storage.saveData();
    renderSettingLists();
    nameInput.value = "";
    utils.showModal("Sukses", "Akun baru berhasil ditambahkan.");
}

function deleteAkun(name) {
    utils.showModal(
        "Konfirmasi Hapus",
        `Hapus akun "${name}"? Ini tidak akan menghapus transaksi yang sudah ada yang menggunakan akun ini.`,
        [
            {
                text: "Ya, Hapus",
                class: "bg-red-600 hover:bg-red-700",
                callback: () => {
                    state.settings.akuns = state.settings.akuns.filter((a) => a.name !== name);
                    storage.saveData();
                    renderSettingLists();
                    utils.closeModal();
                },
            },
            {
                text: "Batal",
                class: "bg-gray-600 hover:bg-gray-700",
                callback: () => utils.closeModal(),
            },
        ]
    );
}

function addKelompok() {
    const nameInput = document.getElementById("new-kelompok-name");
    const name = nameInput.value.trim();
    if (!name) return;
    if (state.settings.kelompoks.some((k) => k.toLowerCase() === name.toLowerCase())) {
        utils.showModal("Peringatan", "Nama kelompok sudah ada.");
        return;
    }
    state.settings.kelompoks.push(name);
    storage.saveData();
    renderSettingLists();
    nameInput.value = "";
    utils.showModal("Sukses", "Kelompok baru berhasil ditambahkan.");
}

function deleteKelompok(name) {
    utils.showModal("Konfirmasi Hapus", `Hapus kelompok "${name}"?`, [
        {
            text: "Ya, Hapus",
            class: "bg-red-600 hover:bg-red-700",
            callback: () => {
                state.settings.kelompoks = state.settings.kelompoks.filter((k) => k !== name);
                storage.saveData();
                renderSettingLists();
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

function showLoadModal() {
    const today = new Date().toISOString().slice(0, 7);
    const body = `<p class="text-sm text-gray-600 mb-4">Pilih tahun dan bulan data yang ingin Anda muat. Perubahan yang belum disimpan pada periode saat ini akan hilang.</p> <input type="month" id="month-selector" class="w-full p-2 border rounded-md" value="${today}">`;
    const actions = [
        {
            text: "Muat Data",
            class: "bg-blue-600 hover:bg-blue-700",
            callback: () => {
                const selectedMonth = document.getElementById("month-selector").value;
                if (selectedMonth) {
                    storage.loadData(selectedMonth);
                    renderAll();
                    utils.closeModal();
                    utils.showModal("Sukses", `Berhasil memuat data untuk periode ${utils.formatMonth(selectedMonth)}.`);
                }
            },
        },
        {
            text: "Batal",
            class: "bg-gray-600 hover:bg-gray-700",
            callback: () => utils.closeModal(),
        },
    ];
    utils.showModal("Muat Data Periode", body, actions);
}

function resetData() {
    utils.showModal(
        "Konfirmasi Reset",
        `Apakah Anda yakin ingin mereset semua data untuk periode <strong>${utils.formatMonth(state.currentMonth)}</strong>? Tindakan ini tidak dapat dibatalkan.`,
        [
            {
                text: "Ya, Reset",
                class: "bg-red-600 hover:bg-red-700",
                callback: () => {
                    storage.resetData();
                    storage.loadData(state.currentMonth);
                    renderAll();
                    utils.showModal("Sukses", `Data untuk periode ${utils.formatMonth(state.currentMonth)} telah direset.`);
                },
            },
            {
                text: "Batal",
                class: "bg-gray-600 hover:bg-gray-700",
                callback: () => utils.closeModal(),
            },
        ]
    );
}
