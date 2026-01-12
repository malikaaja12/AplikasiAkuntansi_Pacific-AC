import { state } from '../state.js';
import { utils } from '../utils.js';
import { getAkunOptions, getKelompokOptions } from './jurnal.js'; // reused helper

export function renderBukuBesarTab() {
    const container = document.getElementById("bukuBesar-tab");
    container.innerHTML = `
        <section class="bg-white p-6 rounded-lg shadow-sm">
            <h2 class="text-xl font-semibold mb-2">Buku Besar</h2>
            <p class="text-sm text-gray-500 mb-4">Pilih sebuah akun dan kelompok untuk melihat riwayat lengkap transaksinya dan saldo akhirnya untuk periode <strong>${utils.formatMonth(state.currentMonth)}</strong>.</p>
            <div class="flex flex-wrap gap-4 mb-4 items-end bg-gray-50 p-4 rounded-md">
                <div> <label for="bb-kelompok-filter" class="block text-sm font-medium text-gray-700">Filter Kelompok</label> <select id="bb-kelompok-filter" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></select> </div>
                <div> <label for="bb-akun-select" class="block text-sm font-medium text-gray-700">Pilih Akun</label> <select id="bb-akun-select" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></select> </div>
                <div> <label for="bb-category-filter" class="block text-sm font-medium text-gray-700">Kategori</label> <select id="bb-category-filter" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"><option value="">Semua Kategori</option><option value="Residential">🏠 Residential</option><option value="Project">🏗️ Project</option></select> </div>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kredit</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                        </tr>
                    </thead>
                    <tbody id="bukuBesar-table-body" class="bg-white divide-y divide-gray-200"></tbody>
                </table>
            </div>
        </section>`;

    // Populate Dropdowns
    const akunSelect = document.getElementById("bb-akun-select");
    const kelompokFilter = document.getElementById("bb-kelompok-filter");

    if (akunSelect) akunSelect.innerHTML = getAkunOptions(true);
    if (kelompokFilter) kelompokFilter.innerHTML = getKelompokOptions(true, "Semua Kelompok");

    renderBukuBesar();
    akunSelect.addEventListener("change", () => renderBukuBesar());
    kelompokFilter.addEventListener("change", () => renderBukuBesar());
    document.getElementById("bb-category-filter").addEventListener("change", () => renderBukuBesar());
}

export function renderBukuBesar() {
    const tbody = document.getElementById("bukuBesar-table-body");
    const akunName = document.getElementById("bb-akun-select").value;
    const kelompokFilter = document.getElementById("bb-kelompok-filter").value;
    const categoryFilter = document.getElementById("bb-category-filter")?.value || "";
    tbody.innerHTML = "";

    if (!akunName) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Silakan pilih akun untuk ditampilkan.</td></tr>`;
        return;
    }

    const transactions = state.jurnals
        .filter((j) => j.akun === akunName && (!kelompokFilter || j.kelompok === kelompokFilter) && (!categoryFilter || j.category === categoryFilter))
        .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal) || a.id - b.id);

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Tidak ada transaksi untuk filter ini.</td></tr>`;
        return;
    }

    let saldo = 0;
    transactions.forEach((trx) => {
        saldo += trx.debit - trx.kredit;
        tbody.innerHTML += `<tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${trx.tanggal}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${trx.keterangan}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">${utils.formatCurrency(trx.debit)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">${utils.formatCurrency(trx.kredit)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">${utils.formatCurrency(saldo)}</td>
        </tr>`;
    });
}
