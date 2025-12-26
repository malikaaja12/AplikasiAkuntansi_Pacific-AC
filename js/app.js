import { state } from './state.js';
import { storage } from './storage.js';
import { renderJurnalTab } from './modules/jurnal.js';
import { renderBukuBesarTab } from './modules/bukuBesar.js';
import { renderLabaRugiTab } from './modules/labaRugi.js';
import { renderNeracaTab } from './modules/neraca.js';
import { renderArusKasTab } from './modules/arusKas.js';
import { renderDataPiutangTab } from './modules/dataPiutang.js';
import { renderStockBarangTab } from './modules/stockBarang.js';
import { renderPengaturanTab } from './modules/pengaturan.js';

export const app = {
    init() {
        storage.loadData(state.currentMonth);
        this.addEventListeners();
        this.changeTab(state.activeTab, true);
    },

    changeTab(tabName, forceRender = false) {
        if (state.activeTab === tabName && !forceRender) return;
        state.activeTab = tabName;

        document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.add("hidden"));
        document.getElementById(`${tabName}-tab`).classList.remove("hidden");

        document.querySelectorAll(".tab-button").forEach((button) => {
            button.classList.remove("active");
            if (button.dataset.tab === tabName) button.classList.add("active");
        });

        this.renderAll();
        storage.saveData();
    },

    renderAll() {
        // Only render the active tab to save performance, 
        // or render all if needed. The original logic rendered just the active one mostly.
        const tab = state.activeTab;
        if (tab === "jurnal") renderJurnalTab();
        else if (tab === "bukuBesar") renderBukuBesarTab();
        else if (tab === "labaRugi") renderLabaRugiTab();
        else if (tab === "pengaturan") renderPengaturanTab();
        else if (tab === "neraca") renderNeracaTab();
        else if (tab === "arusKas") renderArusKasTab();
        else if (tab === "dataPiutang") renderDataPiutangTab();
        else if (tab === "stockBarang") renderStockBarangTab();
    },

    addEventListeners() {
        // Global listeners if any
    },
};

// Expose app for inline onclick handlers in HTML (legacy support, though we're moving trying to avoid it, 
// the original HTML uses `onclick="app.changeTab..."`)
window.app = app;
window.onload = () => app.init();

export function renderAll() {
    app.renderAll();
}
