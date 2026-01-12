import { state } from '../state.js';
import { utils } from '../utils.js';
import { geminiService } from '../services/gemini.js';
import { calculateFinancials } from './labaRugi.js';

export function renderNeracaTab() {
    const container = document.getElementById("neraca-tab");
    const categoryFilter = document.getElementById("neraca-category-filter")?.value || "";

    // Filter jurnals by category
    const filteredJurnals = categoryFilter
        ? state.jurnals.filter(j => j.category === categoryFilter)
        : state.jurnals;

    const { labaBersih } = calculateFinancials(filteredJurnals);

    const getAkunSaldo = (tipe, saldoNormal) => {
        return state.settings.akuns
            .filter((a) => a.type === tipe)
            .map((akun) => {
                const saldo = filteredJurnals
                    .filter((j) => j.akun === akun.name)
                    .reduce((sum, j) => sum + (saldoNormal === "debit" ? j.debit - j.kredit : j.kredit - j.debit), 0);
                return { name: akun.name, saldo };
            })
            .filter((a) => a.saldo !== 0);
    };

    const aset = getAkunSaldo("Aset", "debit");
    const liabilitas = getAkunSaldo("Liabilitas", "kredit");
    const ekuitas = getAkunSaldo("Ekuitas", "kredit");

    const totalAset = aset.reduce((sum, a) => sum + a.saldo, 0);
    let totalEkuitas = ekuitas.reduce((sum, a) => sum + a.saldo, 0) + labaBersih;
    const totalLiabilitas = liabilitas.reduce((sum, a) => sum + a.saldo, 0);
    const totalPasiva = totalLiabilitas + totalEkuitas;

    const createTableRows = (items) => items.map((item) =>
        `<div class="flex justify-between text-sm py-1 border-b border-gray-100"><dt class="text-gray-600">${item.name}</dt><dd>${utils.formatCurrency(item.saldo)}</dd></div>`
    ).join("");

    container.innerHTML = `
         <section class="bg-white p-6 rounded-lg shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h2 class="text-xl font-semibold">Laporan Posisi Keuangan (Neraca)</h2>
                    <p class="text-sm text-gray-500 mb-4">Posisi keuangan untuk periode berakhir pada <strong>${utils.formatMonth(state.currentMonth)}</strong>.</p>
                </div>
                <div class="flex gap-2 items-center">
                    <select id="neraca-category-filter" class="rounded-md border-gray-300 shadow-sm text-sm">
                        <option value="">Semua Kategori</option>
                        <option value="Residential">🏠 Residential</option>
                        <option value="Project">🏗️ Project</option>
                    </select>
                    <button id="analyze-neraca-btn" class="gemini-button inline-flex items-center text-sm py-2 px-4 border border-transparent shadow-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
                        <i class="fas fa-magic mr-2"></i><span class="btn-text">Analisis Gemini</span><i class="fas fa-spinner fa-spin"></i>
                    </button>
                </div>
            </div>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                     <h3 class="text-lg font-semibold border-b pb-2 mb-2 text-blue-700">Aktiva</h3>
                     <dl class="space-y-1">${createTableRows(aset)}</dl>
                     <div class="flex justify-between font-bold border-t-2 pt-2 mt-2"> <dt>Total Aktiva</dt> <dd>${utils.formatCurrency(totalAset)}</dd> </div>
                 </div>
                 <div>
                     <h3 class="text-lg font-semibold border-b pb-2 mb-2 text-green-700">Pasiva</h3>
                     <h4 class="font-medium mt-4 mb-1">Liabilitas</h4>
                     <dl class="space-y-1">${createTableRows(liabilitas)}</dl>
                     <div class="flex justify-between font-semibold border-t pt-2 mt-2"> <dt>Total Liabilitas</dt> <dd>${utils.formatCurrency(totalLiabilitas)}</dd> </div>
                     <h4 class="font-medium mt-4 mb-1">Ekuitas</h4>
                     <dl class="space-y-1">
                        ${createTableRows(ekuitas)}
                        <div class="flex justify-between text-sm py-1"> <dt class="text-gray-600">Laba (Rugi) Periode Ini</dt> <dd>${utils.formatCurrency(labaBersih)}</dd> </div>
                     </dl>
                     <div class="flex justify-between font-semibold border-t pt-2 mt-2"> <dt>Total Ekuitas</dt> <dd>${utils.formatCurrency(totalEkuitas)}</dd> </div>
                     <div class="flex justify-between font-bold border-t-2 pt-2 mt-4"> <dt>Total Pasiva</dt> <dd>${utils.formatCurrency(totalPasiva)}</dd> </div>
                 </div>
             </div>
             <div class="mt-8 text-center p-4 rounded-md ${Math.abs(totalAset - totalPasiva) < 0.01 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">
                 <p class="font-bold">${Math.abs(totalAset - totalPasiva) < 0.01 ? '<i class="fas fa-check-circle mr-2"></i>SEIMBANG' : '<i class="fas fa-exclamation-triangle mr-2"></i>TIDAK SEIMBANG'}</p>
             </div>
         </section>
    `;

    document.getElementById("neraca-category-filter").addEventListener("change", () => renderNeracaTab());
    document.getElementById("analyze-neraca-btn").addEventListener("click", (e) => analyzeNeraca(e, aset, liabilitas, totalAset, totalLiabilitas, totalEkuitas));
}

function analyzeNeraca(event, aset, liabilitas, totalAset, totalLiabilitas, totalEkuitas) {
    const button = event.currentTarget;
    if (totalAset === 0) {
        utils.showModal("Info", "Tidak ada data neraca untuk dianalisis.");
        return;
    }
    const asetDetails = aset.map((a) => `${a.name}: ${utils.formatCurrency(a.saldo)}`).join(", ");
    const liabilitasDetails = liabilitas.map((l) => `${l.name}: ${utils.formatCurrency(l.saldo)}`).join(", ");

    const prompt = `Anda adalah seorang analis keuangan ahli. Berdasarkan data neraca berikut untuk sebuah bisnis kecil di Indonesia, berikan analisis singkat mengenai kesehatan keuangannya. Fokus pada rasio lancar (jika bisa diestimasi dari nama akun), rasio utang terhadap ekuitas, dan berikan saran praktis dalam format poin-poin. Data Neraca: - Total Aset: ${utils.formatCurrency(totalAset)} (Rincian: ${asetDetails || "Tidak ada"}) - Total Liabilitas: ${utils.formatCurrency(totalLiabilitas)} (Rincian: ${liabilitasDetails || "Tidak ada"}) - Total Ekuitas (dihitung): ${utils.formatCurrency(totalEkuitas)}. Berikan jawaban dalam Bahasa Indonesia yang mudah dipahami.`;

    geminiService.callAPI(prompt, button);
}
