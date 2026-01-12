import { state } from '../state.js';
import { utils } from '../utils.js';

export function renderArusKasTab() {
    const container = document.getElementById("arusKas-tab");
    const categoryFilter = document.getElementById("aruskas-category-filter")?.value || "";

    // Filter jurnals by category
    const filteredJurnals = categoryFilter
        ? state.jurnals.filter(j => j.category === categoryFilter)
        : state.jurnals;

    const grouped = filteredJurnals.reduce((acc, curr) => {
        if (!acc[curr.noBukti]) acc[curr.noBukti] = [];
        acc[curr.noBukti].push(curr);
        return acc;
    }, {});

    const cashAccounts = ["Kas", "Bank", "Kas Kecil"];
    const activities = { operasi: [], investasi: [], pendanaan: [] };

    let totalOperasi = 0;
    let totalInvestasi = 0;
    let totalPendanaan = 0;

    Object.values(grouped).forEach((group) => {
        let cashChange = 0;
        group.forEach((entry) => {
            if (cashAccounts.includes(entry.akun)) {
                cashChange += entry.debit - entry.kredit;
            }
        });

        if (Math.abs(cashChange) < 0.01) return;

        const contraEntries = group.filter((entry) => !cashAccounts.includes(entry.akun));

        if (contraEntries.length > 0) {
            const contra = contraEntries[0];
            const akunName = contra.akun;
            const description = contra.keterangan || "Transaksi Kas";
            let category = "operasi";

            if (/peralatan|kendaraan|gedung|tanah|mesin|investasi/i.test(akunName)) {
                category = "investasi";
            } else if (/modal|prive|bank|pinjaman|deviden/i.test(akunName)) {
                if (akunName.includes("Beban") || akunName.includes("Biaya")) {
                    category = "operasi";
                } else {
                    category = "pendanaan";
                }
            }

            const item = { keterangan: `${description} (${akunName})`, jumlah: cashChange };

            if (category === "operasi") {
                activities.operasi.push(item);
                totalOperasi += cashChange;
            } else if (category === "investasi") {
                activities.investasi.push(item);
                totalInvestasi += cashChange;
            } else {
                activities.pendanaan.push(item);
                totalPendanaan += cashChange;
            }
        }
    });

    const formatItem = (item) => `
        <div class="flex justify-between text-sm py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 transition-colors">
            <span class="text-gray-600">${item.keterangan}</span>
            <span class="${item.jumlah >= 0 ? "text-gray-900" : "text-red-600"} font-medium">
                ${item.jumlah < 0 ? "(" + utils.formatCurrency(Math.abs(item.jumlah)) + ")" : utils.formatCurrency(item.jumlah)}
            </span>
        </div>
    `;

    const renderSection = (title, items, total) => `
        <div class="mb-8">
            <h3 class="text-lg font-bold text-gray-800 mb-3 pb-2 border-b-2 border-gray-100">${title}</h3>
            <div class="bg-white rounded-lg border border-gray-200 p-2 mb-3 shadow-sm">
                ${items.length > 0 ? items.map(formatItem).join("") : '<p class="text-gray-400 text-sm italic p-3 text-center">Tidak ada aktivitas pada periode ini.</p>'}
            </div>
            <div class="flex justify-between items-center font-bold text-gray-900 px-4 py-2 bg-gray-50 rounded-md">
                <span>Total ${title}</span>
                <span class="${total < 0 ? "text-red-600" : "text-green-700"} text-lg">
                        ${total < 0 ? "(" + utils.formatCurrency(Math.abs(total)) + ")" : utils.formatCurrency(total)}
                </span>
            </div>
        </div>
    `;

    const netCashFlow = totalOperasi + totalInvestasi + totalPendanaan;

    container.innerHTML = `
        <section class="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto border border-gray-100">
            <div class="text-center mb-10 pb-6 border-b border-gray-200">
                <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan Arus Kas</h2>
                <p class="text-gray-500 mt-2 text-lg">Periode: <span class="font-medium text-blue-600">${utils.formatMonth(state.currentMonth)}</span></p>
                <div class="mt-4">
                    <select id="aruskas-category-filter" class="rounded-md border-gray-300 shadow-sm text-sm">
                        <option value="">Semua Kategori</option>
                        <option value="Residential">🏠 Residential</option>
                        <option value="Project">🏗️ Project</option>
                    </select>
                </div>
            </div>
            <div class="space-y-2">
                ${renderSection("Arus Kas dari Aktivitas Operasi", activities.operasi, totalOperasi)}
                ${renderSection("Arus Kas dari Aktivitas Investasi", activities.investasi, totalInvestasi)}
                ${renderSection("Arus Kas dari Aktivitas Pendanaan", activities.pendanaan, totalPendanaan)}
            </div>
            <div class="mt-10 pt-6 border-t-4 border-gray-100">
                <div class="flex justify-between items-center text-xl sm:text-2xl font-bold bg-green-50 p-6 rounded-xl border border-green-100">
                    <span class="text-green-900">Perubahan Bersih Kas</span>
                    <span class="${netCashFlow >= 0 ? "text-green-700" : "text-red-600"}">
                        ${netCashFlow < 0 ? "(" + utils.formatCurrency(Math.abs(netCashFlow)) + ")" : utils.formatCurrency(netCashFlow)}
                    </span>
                </div>
            </div>
        </section>
    `;

    const filterElement = document.getElementById("aruskas-category-filter");
    if (filterElement) {
        filterElement.addEventListener("change", () => renderArusKasTab());
    }
}
