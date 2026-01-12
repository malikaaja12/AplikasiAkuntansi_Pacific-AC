import { state } from '../state.js';
import { utils } from '../utils.js';
import { storage } from '../storage.js';
import { geminiService } from '../services/gemini.js';

export function getAkunOptions(includePlaceholder = false) {
    let options = includePlaceholder
        ? '<option value="">-- Pilih Akun --</option>'
        : "";
    state.settings.akuns
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((akun) => {
            options += `<option value="${akun.name}">${akun.name}</option>`;
        });
    return options;
}

export function getKelompokOptions(includePlaceholder = false, placeholderText = "-- Pilih Kelompok --") {
    let options = includePlaceholder
        ? `<option value="">-- ${placeholderText} --</option>`
        : "";
    state.settings.kelompoks.sort().forEach((k) => {
        options += `<option value="${k}">${k}</option>`;
    });
    return options;
}

export function renderJurnalTab() {
    const container = document.getElementById("jurnal-tab");
    const defaultDate = new Date(state.currentMonth + "-02").toISOString().split("T")[0];

    container.innerHTML = `
        <div class="mb-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md" role="alert">
            <p class="font-bold">Periode Aktif: ${utils.formatMonth(state.currentMonth)}</p>
            <p>Semua transaksi yang Anda masukkan di bawah akan disimpan untuk periode ini.</p>
        </div>
        <section class="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 class="text-xl font-semibold mb-2">Input Transaksi</h2>
            <p class="text-sm text-gray-500 mb-4">Atur tanggal dan kelompok, lalu tambahkan satu atau lebih baris detail transaksi.</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded-md border">
                <div>
                    <label for="batch-tanggal" class="block text-sm font-medium text-gray-700">Tanggal Transaksi</label>
                    <input type="date" id="batch-tanggal" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${defaultDate}">
                </div>
                <div>
                    <label for="batch-kelompok" class="block text-sm font-medium text-gray-700">Kelompok</label>
                    <select id="batch-kelompok" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        ${getKelompokOptions(true, "Pilih Kelompok")}
                    </select>
                </div>
                <div>
                    <label for="batch-category" class="block text-sm font-medium text-gray-700">Kategori</label>
                    <select id="batch-category" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="">-- Pilih Kategori --</option>
                        <option value="Residential">🏠 Residential</option>
                        <option value="Project">🏗️ Project</option>
                    </select>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table id="jurnal-input-table" class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase w-2/5">Keterangan</th>
                            <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Akun Debit</th>
                            <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Akun Kredit</th>
                            <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah (Rp)</th>
                            <th class="p-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="jurnal-input-body"></tbody>
                </table>
            </div>
            <div class="mt-4 flex flex-wrap gap-2 justify-end">
                <button id="add-row-btn" class="inline-flex items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"><i class="fas fa-plus mr-2"></i>Tambah Baris</button>
                <button id="save-jurnals-btn" class="inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-save mr-2"></i>Simpan Transaksi</button>
            </div>
        </section>
        <section class="bg-white p-6 rounded-lg shadow-sm">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Daftar Jurnal (Riwayat Transaksi)</h2>
                <div class="flex gap-2">
                    <select id="filter-category" class="rounded-md border-gray-300 shadow-sm text-sm">
                        <option value="">Semua Kategori</option>
                        <option value="Residential">🏠 Residential</option>
                        <option value="Project">🏗️ Project</option>
                    </select>
                </div>
            </div>
            <div id="jurnal-list-container" class="space-y-4"></div>
        </section>`;

    renderJurnalTable();
    addInputRow();

    document.getElementById("add-row-btn").addEventListener("click", () => addInputRow());
    document.getElementById("save-jurnals-btn").addEventListener("click", () => saveJurnals());
    document.getElementById("filter-category").addEventListener("change", () => renderJurnalTable());
    document.getElementById("jurnal-input-body").addEventListener("click", (e) => {
        if (e.target.closest(".delete-row-btn")) e.target.closest("tr").remove();
    });

    // Event delegation for the journal list actions
    document.getElementById("jurnal-list-container").addEventListener("click", (e) => {
        const analyzeBtn = e.target.closest("button[data-action='analyze']");
        const deleteBtn = e.target.closest("button[data-action='delete']");

        if (analyzeBtn) {
            analyzeTransaction(analyzeBtn, analyzeBtn.dataset.nobukti);
        } else if (deleteBtn) {
            deleteJurnal(deleteBtn.dataset.nobukti);
        }
    });
}

export function addInputRow() {
    const tbody = document.getElementById("jurnal-input-body");
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="p-1"><input type="text" class="input-keterangan" placeholder="Keterangan transaksi" required></td>
        <td class="p-1"><select class="input-akun-debit" required>${getAkunOptions(true)}</select></td>
        <td class="p-1"><select class="input-akun-kredit" required>${getAkunOptions(true)}</select></td>
        <td class="p-1"><input type="number" class="input-jumlah" placeholder="0" min="0" required></td>
        <td class="p-1 text-center"><button class="delete-row-btn text-gray-400 hover:text-red-500 p-2"><i class="fas fa-trash-alt"></i></button></td>
    `;
    tbody.appendChild(newRow);
}

export function saveJurnals() {
    const batchTanggal = document.getElementById("batch-tanggal").value;
    const batchKelompok = document.getElementById("batch-kelompok").value;
    const batchCategory = document.getElementById("batch-category").value;
    let hasError = false;
    let wrongMonthError = false;

    if (!batchTanggal || !batchKelompok || !batchCategory) {
        utils.showModal("Peringatan", "Tanggal, Kelompok, dan Kategori transaksi harus diisi terlebih dahulu.");
        document.getElementById("batch-tanggal").classList.toggle("input-error", !batchTanggal);
        document.getElementById("batch-kelompok").classList.toggle("input-error", !batchKelompok);
        document.getElementById("batch-category").classList.toggle("input-error", !batchCategory);
        return;
    } else {
        document.getElementById("batch-tanggal").classList.remove("input-error");
        document.getElementById("batch-kelompok").classList.remove("input-error");
        document.getElementById("batch-category").classList.remove("input-error");
    }

    if (batchTanggal.slice(0, 7) !== state.currentMonth) {
        wrongMonthError = true;
        document.getElementById("batch-tanggal").classList.add("input-error");
    }

    if (wrongMonthError) {
        utils.showModal(
            "Peringatan",
            `Tanggal transaksi harus berada dalam periode aktif saat ini (${utils.formatMonth(state.currentMonth)}).`
        );
        return;
    }

    const rows = document.querySelectorAll("#jurnal-input-body tr");
    const newJurnals = [];
    rows.forEach((row) => row.querySelectorAll("input, select").forEach((el) => el.classList.remove("input-error")));

    const validRows = Array.from(rows).filter((row) => {
        const keterangan = row.querySelector(".input-keterangan").value.trim();
        const jumlah = parseFloat(row.querySelector(".input-jumlah").value) || 0;

        if (keterangan && jumlah > 0) {
            return true;
        } else if (keterangan || jumlah > 0) {
            hasError = true;
            row.querySelectorAll("input, select").forEach((el) => {
                if (!el.value) el.classList.add("input-error");
            });
            return false;
        }
        return false;
    });

    if (hasError) {
        utils.showModal("Peringatan", "Beberapa baris tidak lengkap. Pastikan semua kolom yang diperlukan terisi dengan benar.");
        return;
    }

    if (validRows.length === 0) {
        utils.showModal("Info", "Tidak ada data valid untuk disimpan.");
        return;
    }

    const batchNoBukti = `TRX-${Date.now()}`;

    validRows.forEach((row) => {
        const jumlah = parseFloat(row.querySelector(".input-jumlah").value);
        const akunDebit = row.querySelector(".input-akun-debit").value;
        const akunKredit = row.querySelector(".input-akun-kredit").value;
        const keterangan = row.querySelector(".input-keterangan").value.trim();
        const baseEntry = {
            tanggal: batchTanggal,
            noBukti: batchNoBukti,
            keterangan: keterangan,
            kelompok: batchKelompok,
            category: batchCategory,
        };
        newJurnals.push({
            ...baseEntry,
            id: Date.now() + Math.random(),
            akun: akunDebit,
            debit: jumlah,
            kredit: 0,
        });
        newJurnals.push({
            ...baseEntry,
            id: Date.now() + Math.random(),
            akun: akunKredit,
            debit: 0,
            kredit: jumlah,
        });
    });

    state.jurnals.push(...newJurnals);
    storage.saveData();
    renderJurnalTable();
    document.getElementById("jurnal-input-body").innerHTML = "";
    addInputRow();
    utils.showModal(
        "Sukses",
        `${validRows.length} transaksi berhasil disimpan untuk periode ${utils.formatMonth(state.currentMonth)}!`
    );
}

export function renderJurnalTable() {
    const container = document.getElementById("jurnal-list-container");
    if (!container) return;

    const filterCategory = document.getElementById("filter-category")?.value || "";
    container.innerHTML = "";

    // Filter journals by category
    const filteredJurnals = filterCategory
        ? state.jurnals.filter(j => j.category === filterCategory)
        : state.jurnals;

    const groupedJurnals = filteredJurnals.reduce((acc, j) => {
        (acc[j.noBukti] = acc[j.noBukti] || []).push(j);
        return acc;
    }, {});

    const sortedNoBukti = Object.keys(groupedJurnals).sort((a, b) => {
        const dateA = new Date(groupedJurnals[a][0].tanggal);
        const dateB = new Date(groupedJurnals[b][0].tanggal);
        return dateB - dateA;
    });

    if (sortedNoBukti.length === 0) {
        const message = filterCategory
            ? `Tidak ada jurnal ${filterCategory} untuk periode ${utils.formatMonth(state.currentMonth)}.`
            : `Belum ada jurnal yang tersimpan untuk periode ${utils.formatMonth(state.currentMonth)}.`;
        container.innerHTML = `<div class="text-center py-8 text-gray-500">${message}</div>`;
        return;
    }

    sortedNoBukti.forEach((noBukti) => {
        const entries = groupedJurnals[noBukti];
        const firstEntry = entries[0];
        let tableRows = "";
        const transactionsByKeterangan = entries.reduce((acc, j) => {
            if (!acc[j.keterangan]) {
                acc[j.keterangan] = { debit: 0, kredit: 0, akunDebit: "", akunKredit: "" };
            }
            if (j.debit > 0) {
                acc[j.keterangan].debit += j.debit;
                acc[j.keterangan].akunDebit = j.akun;
            }
            if (j.kredit > 0) {
                acc[j.keterangan].kredit += j.kredit;
                acc[j.keterangan].akunKredit = j.akun;
            }
            return acc;
        }, {});

        Object.entries(transactionsByKeterangan).forEach(([keterangan, trx]) => {
            tableRows += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 pl-8">
                        <div class="text-sm font-medium text-gray-800">${keterangan}</div>
                        <div class="text-xs text-gray-500 italic">${trx.akunDebit} (D) -> ${trx.akunKredit} (K)</div>
                    </td>
                    <td class="px-4 py-2 text-sm text-right">${utils.formatCurrency(trx.debit)}</td>
                    <td class="px-4 py-2 text-sm text-right">${utils.formatCurrency(trx.kredit)}</td>
                </tr>`;
        });

        const groupHtml = `
            <div class="border rounded-lg overflow-hidden">
                <div class="bg-gray-50 p-3 flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <p class="font-semibold text-gray-800">${firstEntry.noBukti}</p>
                        <p class="text-sm text-gray-500">
                            ${firstEntry.tanggal} | Kelompok: ${firstEntry.kelompok || "Lainnya"}
                            ${firstEntry.category ? `| <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${firstEntry.category === 'Residential' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">${firstEntry.category === 'Residential' ? '🏠' : '🏗️'} ${firstEntry.category}</span>` : ''}
                        </p>
                    </div>
                     <div class="flex items-center gap-2">
                        <button data-action="analyze" data-nobukti="${noBukti}" class="gemini-button inline-flex items-center text-xs py-1 px-3 border border-transparent shadow-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
                            <i class="fas fa-magic mr-1"></i> <span class="btn-text">Analisis</span> <i class="fas fa-spinner fa-spin"></i>
                        </button>
                        <button data-action="delete" data-nobukti="${noBukti}" class="text-gray-400 hover:text-red-600 text-xs py-1 px-2"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <table class="min-w-full">
                     <thead>
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pl-8">Keterangan</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kredit</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>`;
        container.innerHTML += groupHtml;
    });
}

export function deleteJurnal(noBukti) {
    utils.showModal(
        "Konfirmasi Hapus",
        `Yakin ingin menghapus semua entri untuk transaksi ini?`,
        [
            {
                text: "Ya, Hapus",
                class: "bg-red-600 hover:bg-red-700",
                callback: () => {
                    state.jurnals = state.jurnals.filter((j) => j.noBukti !== noBukti);
                    storage.saveData();
                    // We need to re-render all tabs potentially, but locally re-rendering the jurnal tab is minimal
                    // The monolithic app used renderAll(). In modules, we might just re-render this module if active
                    renderJurnalTable();
                    utils.showModal("Sukses", `Transaksi ${noBukti} dihapus.`);
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

export function analyzeTransaction(button, noBukti) {
    const entries = state.jurnals.filter((j) => j.noBukti === noBukti);
    if (entries.length === 0) return;
    let transactionDetails = entries
        .map((e) => `${e.akun}: ${e.debit > 0 ? "Debit " + utils.formatCurrency(e.debit) : "Kredit " + utils.formatCurrency(e.kredit)}`)
        .join("\n");
    const prompt = `Anda adalah seorang akuntan ahli yang ramah. Analisis entri jurnal umum berikut untuk sebuah bisnis kecil di Indonesia. Jelaskan dalam bahasa Indonesia yang sederhana apa arti transaksi ini dari sudut pandang bisnis. Berikan penjelasan dalam format poin-poin ringkas. Transaksi:\n${transactionDetails}`;
    geminiService.callAPI(prompt, button);
}
