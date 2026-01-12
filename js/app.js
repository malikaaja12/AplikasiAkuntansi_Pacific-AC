import { state } from "./state.js";
import { storage } from "./storage.js";
import { renderDashboardTab } from "./modules/dashboard.js";
import { renderJurnalTab } from "./modules/jurnal.js";
import { renderBukuBesarTab } from "./modules/bukuBesar.js";
import { renderTrialBalanceTab } from "./modules/trialBalance.js";
import { renderLabaRugiTab } from "./modules/labaRugi.js";
import { renderNeracaTab } from "./modules/neraca.js";
import { renderArusKasTab } from "./modules/arusKas.js";
import { renderDataPiutangTab } from "./modules/dataPiutang.js";
import { renderStockBarangTab } from "./modules/stockBarang.js";
import { renderPengaturanTab } from "./modules/pengaturan.js";
import { utils } from "./utils.js";

const app = {
  init() {
    storage.loadData(state.currentMonth);
    this.updatePeriodDisplay();
    this.addEventListeners();
    state.activeTab = "dashboard"; // Start with dashboard
    this.changeTab(state.activeTab, true);
  },

  changeTab(tabName, forceRender = false) {
    if (state.activeTab === tabName && !forceRender) return;
    state.activeTab = tabName;

    document
      .querySelectorAll(".tab-content")
      .forEach((tab) => tab.classList.add("hidden"));
    document.getElementById(`${tabName}-tab`).classList.remove("hidden");

    document
      .querySelectorAll(".tab-button, .mobile-tab-button")
      .forEach((button) => {
        button.classList.remove("active");
        if (button.dataset.tab === tabName) button.classList.add("active");
      });

    // Close mobile menu
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenu) mobileMenu.classList.add("hidden");

    this.renderAll();
    storage.saveData();
  },

  renderAll() {
    const tab = state.activeTab;
    if (tab === "dashboard") renderDashboardTab();
    else if (tab === "jurnal") renderJurnalTab();
    else if (tab === "bukuBesar") renderBukuBesarTab();
    else if (tab === "trialBalance") renderTrialBalanceTab();
    else if (tab === "labaRugi") renderLabaRugiTab();
    else if (tab === "pengaturan") renderPengaturanTab();
    else if (tab === "neraca") renderNeracaTab();
    else if (tab === "arusKas") renderArusKasTab();
    else if (tab === "dataPiutang") renderDataPiutangTab();
    else if (tab === "stockBarang") renderStockBarangTab();
  },

  addEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => {
        const mobileMenu = document.getElementById("mobile-menu");
        if (mobileMenu) {
          mobileMenu.classList.toggle("hidden");
        }
      });
    }
  },

  updatePeriodDisplay() {
    const periodDisplay = document.getElementById("current-period-display");
    if (periodDisplay) {
      periodDisplay.textContent = utils.formatMonth(state.currentMonth);
    }
  },
};

// Expose app for inline onclick handlers in HTML (legacy support, though we're moving trying to avoid it,
// the original HTML uses `onclick="app.changeTab..."`)
window.app = app;
window.onload = () => app.init();

export function renderAll() {
  app.renderAll();
}

export default app;
