import { state } from '../state.js';
import { utils } from '../utils.js';

export function renderTrialBalanceTab() {
    const container = document.getElementById("trialBalance-tab");

    container.innerHTML = `
        <section class="bg-white p-6 rounded-lg shadow-sm">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Neraca Saldo (Trial Balance)</h2>
                <p class="text-sm text-gray-500 mt-2">Periode: <strong>${utils.formatMonth(state.currentMonth)}</strong></p>
                <p class="text-xs text-gray-400 mt-1">Menampilkan saldo semua akun untuk memastikan keseimbangan debit dan kredit</p>
            </div>

            <div class="flex gap-4 mb-6 items-end bg-gray-50 p-4 rounded-md">
                <div>
                    <label for="tb-category-filter" class="block text-sm font-medium text-gray-700">Filter Kategori</label>
                    <select id="tb-category-filter" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="">Semua Kategori</option>
                        <option value="Residential">🏠 Residential</option>
                        <option value="Project">🏗️ Project</option>
                    </select>
                </div>
                <button id="btn-render-trial-balance" class="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <i class="fas fa-sync-alt mr-2"></i>Refresh
                </button>
            </div>

            <div id="trial-balance-content"></div>
        </section>
    `;

    renderTrialBalance();

    document.getElementById("btn-render-trial-balance").addEventListener("click", () => renderTrialBalance());
    document.getElementById("tb-category-filter").addEventListener("change", () => renderTrialBalance());
}

export function renderTrialBalance() {
    const container = document.getElementById("trial-balance-content");
    const categoryFilter = document.getElementById("tb-category-filter")?.value || "";

    // Filter journals by category
    const filteredJurnals = categoryFilter
        ? state.jurnals.filter(j => j.category === categoryFilter)
        : state.jurnals;

    // Calculate balances for each account
    const accountBalances = {};

    // Initialize with opening balances
    Object.entries(state.settings.openingBalances || {}).forEach(([accountCode, data]) => {
        const account = state.settings.akuns.find(a => a.code === accountCode);
        if (account && data.period === state.currentMonth) {
            accountBalances[accountCode] = {
                name: account.name,
                type: account.type,
                normalBalance: account.normalBalance || 'debit',
                debit: account.normalBalance === 'debit' ? data.amount : 0,
                kredit: account.normalBalance === 'kredit' ? data.amount : 0
            };
        }
    });

    // Add transactions
    filteredJurnals.forEach(j => {
        const account = state.settings.akuns.find(a => a.name === j.akun);
        if (!account) return;

        const code = account.code || account.name;
        if (!accountBalances[code]) {
            accountBalances[code] = {
                name: account.name,
                type: account.type,
                normalBalance: account.normalBalance || 'debit',
                debit: 0,
                kredit: 0
            };
        }

        accountBalances[code].debit += j.debit;
        accountBalances[code].kredit += j.kredit;
    });

    // Group by account type
    const grouped = {
        'Aset': [],
        'Liabilitas': [],
        'Ekuitas': [],
        'Pendapatan': [],
        'Beban': []
    };

    Object.entries(accountBalances).forEach(([code, data]) => {
        if (grouped[data.type]) {
            grouped[data.type].push({ code, ...data });
        }
    });

    // Calculate totals
    let totalDebit = 0;
    let totalKredit = 0;

    Object.values(accountBalances).forEach(acc => {
        totalDebit += acc.debit;
        totalKredit += acc.kredit;
    });

    // Render table
    let html = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 border">
                <thead class="bg-gray-800 text-white">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Kode</th>
                        <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Nama Akun</th>
                        <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Debit</th>
                        <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Kredit</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;

    // Render each account type
    ['Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban'].forEach(type => {
        if (grouped[type].length > 0) {
            html += `
                <tr class="bg-blue-50">
                    <td colspan="4" class="px-4 py-2 font-bold text-blue-900">${type}</td>
                </tr>
            `;

            grouped[type]
                .sort((a, b) => a.code.localeCompare(b.code))
                .forEach(acc => {
                    html += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-2 text-sm text-gray-600">${acc.code}</td>
                            <td class="px-4 py-2 text-sm text-gray-900">${acc.name}</td>
                            <td class="px-4 py-2 text-sm text-right font-medium">${acc.debit > 0 ? utils.formatCurrency(acc.debit) : '-'}</td>
                            <td class="px-4 py-2 text-sm text-right font-medium">${acc.kredit > 0 ? utils.formatCurrency(acc.kredit) : '-'}</td>
                        </tr>
                    `;
                });
        }
    });

    // Total row
    const isBalanced = Math.abs(totalDebit - totalKredit) < 0.01;
    html += `
                <tr class="bg-gray-900 text-white font-bold">
                    <td colspan="2" class="px-4 py-3 text-right uppercase">TOTAL</td>
                    <td class="px-4 py-3 text-right text-lg">${utils.formatCurrency(totalDebit)}</td>
                    <td class="px-4 py-3 text-right text-lg">${utils.formatCurrency(totalKredit)}</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="mt-6 p-4 rounded-lg ${isBalanced ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}">
        <div class="flex items-center justify-center">
            <i class="fas ${isBalanced ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-red-600'} text-2xl mr-3"></i>
            <div>
                <p class="font-bold text-lg ${isBalanced ? 'text-green-900' : 'text-red-900'}">
                    ${isBalanced ? 'SEIMBANG ✓' : 'TIDAK SEIMBANG ✗'}
                </p>
                <p class="text-sm ${isBalanced ? 'text-green-700' : 'text-red-700'}">
                    Selisih: ${utils.formatCurrency(Math.abs(totalDebit - totalKredit))}
                </p>
            </div>
        </div>
    </div>
    `;

    if (Object.keys(accountBalances).length === 0) {
        html = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-inbox text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg">Belum ada transaksi untuk periode ini</p>
                <p class="text-sm mt-2">Mulai dengan menambahkan transaksi di tab "Input Transaksi"</p>
            </div>
        `;
    }

    container.innerHTML = html;
}
