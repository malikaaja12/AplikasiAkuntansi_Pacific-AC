import { state } from "../state.js";
import { utils } from "../utils.js";
import { calculateFinancials } from "./labaRugi.js";
import { accountingUtils } from "../accountingUtils.js";

export function renderDashboardTab() {
  const container = document.getElementById("dashboard-tab");

  // Calculate financial data
  const {
    totalPendapatan,
    totalBeban,
    labaBersih,
    pendapatanDetails,
    bebanDetails,
  } = calculateFinancials();

  // Calculate cash flow
  const cashAccounts = ["Kas", "Bank", "Kas Kecil"];
  let totalCash = 0;

  state.jurnals.forEach((j) => {
    if (cashAccounts.includes(j.akun)) {
      totalCash += j.debit - j.kredit;
    }
  });

  // Get opening balance for cash
  cashAccounts.forEach((accName) => {
    const account = state.settings.akuns.find((a) => a.name === accName);
    if (account && account.code) {
      const opening = state.settings.openingBalances?.[account.code];
      if (opening && opening.period === state.currentMonth) {
        totalCash += opening.amount;
      }
    }
  });

  // Count transactions
  const totalTransactions = state.jurnals.length;
  const uniqueJournals = [...new Set(state.jurnals.map((j) => j.noBukti))]
    .length;

  // Trial balance validation
  const { isBalanced, difference } = accountingUtils.validateTrialBalance();

  // Recent transactions (last 5)
  const recentJournals = [...new Set(state.jurnals.map((j) => j.noBukti))]
    .slice(-5)
    .reverse();

  container.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-lg shadow-lg">
                <h1 class="text-3xl font-bold mb-2">Dashboard</h1>
                <p class="text-blue-100">Periode: <strong>${utils.formatMonth(
    state.currentMonth
  )}</strong></p>
                <p class="text-sm text-blue-200 mt-1">Ringkasan dan analisis keuangan bisnis Anda</p>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Laba Bersih -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 ${labaBersih >= 0 ? "border-green-500" : "border-red-500"
    }">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 font-medium">Laba Bersih</p>
                            <p class="text-2xl font-bold ${labaBersih >= 0
      ? "text-green-600"
      : "text-red-600"
    } mt-2">
                                ${utils.formatCurrency(labaBersih)}
                            </p>
                        </div>
                        <div class="bg-${labaBersih >= 0 ? "green" : "red"
    }-100 p-3 rounded-full">
                            <i class="fas fa-chart-line text-2xl text-${labaBersih >= 0 ? "green" : "red"
    }-600"></i>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-3">
                        <i class="fas fa-${labaBersih >= 0
      ? "arrow-up text-green-500"
      : "arrow-down text-red-500"
    }"></i>
                        ${labaBersih >= 0 ? "Profit" : "Loss"}
                    </p>
                </div>

                <!-- Total Pendapatan -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 font-medium">Total Pendapatan</p>
                            <p class="text-2xl font-bold text-blue-600 mt-2">
                                ${utils.formatCurrency(totalPendapatan)}
                            </p>
                        </div>
                        <div class="bg-blue-100 p-3 rounded-full">
                            <i class="fas fa-dollar-sign text-2xl text-blue-600"></i>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-3">
                        <i class="fas fa-info-circle"></i> Revenue
                    </p>
                </div>

                <!-- Total Beban -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 font-medium">Total Beban</p>
                            <p class="text-2xl font-bold text-orange-600 mt-2">
                                ${utils.formatCurrency(totalBeban)}
                            </p>
                        </div>
                        <div class="bg-orange-100 p-3 rounded-full">
                            <i class="fas fa-receipt text-2xl text-orange-600"></i>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-3">
                        <i class="fas fa-info-circle"></i> Expenses
                    </p>
                </div>

                <!-- Saldo Kas -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600 font-medium">Saldo Kas</p>
                            <p class="text-2xl font-bold text-purple-600 mt-2">
                                ${utils.formatCurrency(totalCash)}
                            </p>
                        </div>
                        <div class="bg-purple-100 p-3 rounded-full">
                            <i class="fas fa-wallet text-2xl text-purple-600"></i>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-3">
                        <i class="fas fa-info-circle"></i> Cash Balance
                    </p>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Laba Rugi Pie Chart -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-chart-pie text-blue-600 mr-2"></i>
                        Komposisi Laba Rugi
                    </h3>
                    <div class="chart-container" style="height: 300px;">
                        <canvas id="dashboard-profit-chart"></canvas>
                    </div>
                </div>

                <!-- Arus Kas Line Chart -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <i class="fas fa-chart-line text-green-600 mr-2"></i>
                        Tren Saldo Kas Harian
                    </h3>
                    <div class="chart-container" style="height: 300px;">
                        <canvas id="dashboard-cashflow-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Bottom Row -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Recent Transactions -->
                <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-history text-indigo-600 mr-2"></i>
                        Transaksi Terbaru
                    </h3>
                    <div id="recent-transactions" class="space-y-3">
                        ${renderRecentTransactions(recentJournals)}
                    </div>
                </div>

                <!-- Quick Stats -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-info-circle text-gray-600 mr-2"></i>
                        Statistik
                    </h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center pb-3 border-b">
                            <span class="text-sm text-gray-600">Total Jurnal</span>
                            <span class="font-bold text-gray-900">${uniqueJournals}</span>
                        </div>
                        <div class="flex justify-between items-center pb-3 border-b">
                            <span class="text-sm text-gray-600">Total Entri</span>
                            <span class="font-bold text-gray-900">${totalTransactions}</span>
                        </div>
                        <div class="flex justify-between items-center pb-3 border-b">
                            <span class="text-sm text-gray-600">Akun Aktif</span>
                            <span class="font-bold text-gray-900">${state.settings.akuns.length
    }</span>
                        </div>
                        <div class="flex justify-between items-center pb-3 border-b">
                            <span class="text-sm text-gray-600">Trial Balance</span>
                            <span class="font-bold ${isBalanced ? "text-green-600" : "text-red-600"
    }">
                                ${isBalanced ? "✓ Seimbang" : "✗ Tidak Seimbang"
    }
                            </span>
                        </div>
                        ${!isBalanced
      ? `
                        <div class="bg-red-50 p-3 rounded-md">
                            <p class="text-xs text-red-700">
                                <i class="fas fa-exclamation-triangle mr-1"></i>
                                Selisih: ${utils.formatCurrency(difference)}
                            </p>
                        </div>
                        `
      : ""
    }
                    </div>
                </div>
            </div>
        </div>
    `;

  // Render charts
  renderProfitChart(pendapatanDetails, bebanDetails);
  renderCashflowChart();
}

function renderRecentTransactions(recentJournals) {
  if (recentJournals.length === 0) {
    return `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-inbox text-4xl mb-2"></i>
                <p class="text-sm">Belum ada transaksi</p>
            </div>
        `;
  }

  return recentJournals
    .map((noBukti) => {
      const entries = state.jurnals.filter((j) => j.noBukti === noBukti);
      if (entries.length === 0) return "";

      const first = entries[0];
      const totalAmount = entries.reduce((sum, e) => sum + e.debit, 0);

      return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                <div class="flex-grow">
                    <p class="font-medium text-sm text-gray-900">${first.noBukti
        }</p>
                    <p class="text-xs text-gray-500">${first.tanggal} • ${first.kelompok || "Lainnya"
        }</p>
                    ${first.category
          ? `<span class="inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${first.category === "Residential"
            ? "bg-blue-100 text-blue-700"
            : "bg-green-100 text-green-700"
          }">${first.category === "Residential" ? "🏠" : "🏗️"
          } ${first.category}</span>`
          : ""
        }
                </div>
                <div class="text-right">
                    <p class="font-bold text-sm text-gray-900">${utils.formatCurrency(
          totalAmount
        )}</p>
                    <p class="text-xs text-gray-500">${entries.length} entri</p>
                </div>
            </div>
        `;
    })
    .join("");
}

let profitChartInstance = null;
let cashflowChartInstance = null;

function renderProfitChart(pendapatanDetails, bebanDetails) {
  const ctx = document.getElementById("dashboard-profit-chart");
  if (!ctx) return;

  const labels = [];
  const data = [];
  const colors = [];

  // Add pendapatan
  Object.entries(pendapatanDetails).forEach(([name, value]) => {
    if (value > 0) {
      labels.push(name);
      data.push(value);
      colors.push("#3b82f6"); // blue
    }
  });

  // Add beban
  Object.entries(bebanDetails).forEach(([name, value]) => {
    if (value > 0) {
      labels.push(name);
      data.push(value);
      colors.push("#f97316"); // orange
    }
  });

  if (profitChartInstance) profitChartInstance.destroy();

  if (data.length === 0) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  profitChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              return `${label}: ${utils.formatCurrency(value)}`;
            },
          },
        },
      },
    },
  });
}

function renderCashflowChart() {
  const ctx = document.getElementById("dashboard-cashflow-chart");
  if (!ctx) return;

  const cashAccounts = ["Kas", "Bank", "Kas Kecil"];

  // Get the number of days in the current month
  const [year, month] = state.currentMonth.split("-");
  const daysInMonth = new Date(year, month, 0).getDate();

  // Initialize daily cash balances
  const dailyBalances = {};

  // Get opening balance
  let openingBalance = 0;
  cashAccounts.forEach((accName) => {
    const account = state.settings.akuns.find((a) => a.name === accName);
    if (account && account.code) {
      const opening = state.settings.openingBalances?.[account.code];
      if (opening && opening.period === state.currentMonth) {
        openingBalance += opening.amount;
      }
    }
  });

  // Calculate daily cash changes
  state.jurnals.forEach((j) => {
    if (cashAccounts.includes(j.akun)) {
      const date = j.tanggal; // Format: YYYY-MM-DD
      if (date.startsWith(state.currentMonth)) {
        const day = parseInt(date.split("-")[2]);
        if (!dailyBalances[day]) {
          dailyBalances[day] = 0;
        }
        dailyBalances[day] += j.debit - j.kredit;
      }
    }
  });

  // Create cumulative balance array for each day
  const labels = [];
  const cashData = [];
  let cumulativeBalance = openingBalance;

  for (let day = 1; day <= daysInMonth; day++) {
    labels.push(day.toString());

    // Add daily change to cumulative balance
    if (dailyBalances[day]) {
      cumulativeBalance += dailyBalances[day];
    }

    cashData.push(cumulativeBalance);
  }

  if (cashflowChartInstance) cashflowChartInstance.destroy();

  cashflowChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Saldo Kas",
          data: cashData,
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "rgb(34, 197, 94)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: function (context) {
              return `Tanggal ${context[0].label} ${new Date(year, month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
            },
            label: function (context) {
              return `Saldo Kas: ${utils.formatCurrency(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Hari',
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          ticks: {
            maxTicksLimit: 15,
            font: {
              size: 10
            }
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Saldo Kas',
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          ticks: {
            callback: function (value) {
              return utils.formatCurrency(value);
            },
          },
        },
      },
    },
  });
}
