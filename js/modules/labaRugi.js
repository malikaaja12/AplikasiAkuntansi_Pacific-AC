import { state } from '../state.js';
import { utils } from '../utils.js';
import { getKelompokOptions } from './jurnal.js';
import { geminiService } from '../services/gemini.js';

export function calculateFinancials(jurnals = state.jurnals) {
    const pendapatanAkuns = state.settings.akuns.filter((a) => a.type === "Pendapatan");
    const bebanAkuns = state.settings.akuns.filter((a) => a.type === "Beban");

    const calcTotal = (akuns, type) =>
        akuns.reduce((acc, curr) => {
            acc[curr.name] = jurnals
                .filter((j) => j.akun === curr.name)
                .reduce((sum, j) => sum + (type === "Pendapatan" ? j.kredit - j.debit : j.debit - j.kredit), 0);
            return acc;
        }, {});

    const pendapatanDetails = calcTotal(pendapatanAkuns, "Pendapatan");
    const bebanDetails = calcTotal(bebanAkuns, "Beban");

    const totalPendapatan = Object.values(pendapatanDetails).reduce((s, v) => s + v, 0);
    const totalBeban = Object.values(bebanDetails).reduce((s, v) => s + v, 0);
    const labaBersih = totalPendapatan - totalBeban;

    return {
        pendapatanDetails,
        bebanDetails,
        totalPendapatan,
        totalBeban,
        labaBersih,
    };
}

export function renderLabaRugiTab() {
    const container = document.getElementById("labaRugi-tab");
    container.innerHTML = `
        <section class="bg-white p-6 rounded-lg shadow-sm">
            <h2 class="text-xl font-semibold mb-2">Laporan Laba Rugi</h2>
            <p class="text-sm text-gray-500 mb-4">Laporan untuk periode <strong>${utils.formatMonth(state.currentMonth)}</strong>. Gunakan filter untuk analisis yang lebih spesifik.</p>
            <div class="flex flex-wrap gap-4 mb-6 items-end bg-gray-50 p-4 rounded-md">
                <div> <label for="lr-kelompok-filter" class="block text-sm font-medium text-gray-700">Filter Kelompok</label> <select id="lr-kelompok-filter" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></select> </div>
                <div> <label for="lr-start-date" class="block text-sm font-medium text-gray-700">Dari Tanggal</label> <input type="date" id="lr-start-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"> </div>
                <div> <label for="lr-end-date" class="block text-sm font-medium text-gray-700">Sampai Tanggal</label> <input type="date" id="lr-end-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"> </div>
                <button id="btn-render-laba-rugi" class="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Tampilkan</button>
            </div>
             <div>
             <label for="filter-category" class="block text-sm font-medium text-gray-700">Kategori</label>
                    <select id="filter-category" class="mb-6 mt-1 block w-40 rounded-md border-gray-300 shadow-sm">
                        <option value="">-- Pilih Kategori --</option>
                        <option value="Residential">🏠 Residential</option>
                        <option value="Project">🏗️ Project</option>
                        </select>
             </div>
            <div id="labaRugi-container">
                <button id="analyze-lr-btn" class="gemini-button mb-4 w-full sm:w-auto inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
                    <i class="fas fa-magic mr-2"></i> <span class="btn-text">✨ Buat Analisis Laporan</span> <i class="fas fa-spinner fa-spin"></i>
                </button>
                <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div id="labaRugi-content" class="lg:col-span-3"></div>
                    <div class="lg:col-span-2">
                        <h3 class="text-lg font-semibold text-center mb-2">Visualisasi Komposisi Beban</h3>
                        <div class="chart-container"> <canvas id="bebanChart"></canvas> </div>
                    </div>
                </div>
            </div>
        </section>`;

    document.getElementById("lr-kelompok-filter").innerHTML = getKelompokOptions(true, "Semua Kelompok");

    renderLabaRugi();
    document.getElementById("filter-category").addEventListener("change", () => renderLabaRugi());
    document.getElementById("btn-render-laba-rugi").addEventListener("click", () => renderLabaRugi());
    document.getElementById("analyze-lr-btn").addEventListener("click", (e) => analyzeLabaRugi(e));
}

export function renderLabaRugi() {
    const container = document.getElementById("labaRugi-content");
    const filterCategory = document.getElementById("filter-category")?.value || "";

    // Filter jurnals by category if selected
    const filteredJurnals = filterCategory
        ? state.jurnals.filter(j => j.category === filterCategory)
        : state.jurnals;

    const { pendapatanDetails, bebanDetails, totalPendapatan, totalBeban, labaBersih } = calculateFinancials(filteredJurnals);

    let html = `<div class="space-y-6">`;
    const createSection = (title, details, total) => {
        let sectionHtml = `<div><h3 class="text-lg font-semibold border-b pb-2 mb-2">${title}</h3><dl class="space-y-1">`;
        Object.entries(details)
            .filter(([, val]) => val !== 0)
            .forEach(([akun, jumlah]) => {
                sectionHtml += `<div class="flex justify-between text-sm"><dt class="text-gray-600">${akun}</dt><dd>${utils.formatCurrency(jumlah)}</dd></div>`;
            });
        sectionHtml += `</dl><div class="flex justify-between font-bold border-t pt-2 mt-2"><dt>Total ${title}</dt><dd>${utils.formatCurrency(total)}</dd></div></div>`;
        return sectionHtml;
    };

    html += createSection("Pendapatan", pendapatanDetails, totalPendapatan);
    html += createSection("Beban", bebanDetails, totalBeban);
    html += `<div class="flex justify-between text-xl font-bold border-t-2 border-gray-900 pt-3 mt-4"><dt>LABA (RUGI) BERSIH</dt><dd class="${labaBersih >= 0 ? "text-green-600" : "text-red-600"}">${utils.formatCurrency(labaBersih)}</dd></div></div>`;

    container.innerHTML = html;
    renderBebanChart(bebanDetails);
}

let chartInstance = null;

function renderBebanChart(bebanDetails) {
    const ctx = document.getElementById("bebanChart").getContext("2d");
    const filteredBeban = Object.entries(bebanDetails).filter(([, val]) => val > 0);
    const labels = filteredBeban.map(([key]) => (key.length > 16 ? key.substring(0, 16) + "..." : key));
    const data = filteredBeban.map(([, val]) => val);

    if (chartInstance) chartInstance.destroy();

    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Inter";
        ctx.fillStyle = "#6b7280";
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data beban untuk ditampilkan.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                label: "Komposisi Beban",
                data,
                backgroundColor: ["#3b82f6", "#ef4444", "#f97316", "#84cc16", "#14b8a6", "#a855f7", "#ec4899"],
                borderColor: "#ffffff",
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } },
        },
    });
}

function analyzeLabaRugi(event) {
    const button = event.currentTarget;
    const { totalPendapatan, totalBeban, labaBersih, bebanDetails } = calculateFinancials();
    const bebanTerbesar = Object.entries(bebanDetails)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([key, val]) => `${key}: ${utils.formatCurrency(val)}`)
        .join(", ");

    const prompt = `Anda adalah seorang analis keuangan yang ramah. Berikan ringkasan singkat dan analisis mengenai laporan laba rugi berikut untuk sebuah bisnis kecil di Indonesia. Fokus pada poin-poin penting dalam format poin-poin yang mudah dibaca. Data Laporan: Total Pendapatan: ${utils.formatCurrency(totalPendapatan)}, Total Beban: ${utils.formatCurrency(totalBeban)}, Laba/Rugi Bersih: ${utils.formatCurrency(labaBersih)}. Komposisi beban terbesar adalah ${bebanTerbesar || "tidak ada"}.`;

    geminiService.callAPI(prompt, button);
}
