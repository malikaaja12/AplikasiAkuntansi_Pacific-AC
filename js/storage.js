import { state } from "./state.js";
import { utils } from "./utils.js";

export const storage = {
  getDefaultSettings() {
    return {
      akuns: [
        { name: "Kas", type: "Aset" },
        { name: "Kas Proyek", type: "Aset" },
        { name: "Bank", type: "Aset" },
        { name: "Kas Kecil", type: "Aset" },
        { name: "Piutang Karyawan", type: "Aset" },
        { name: "Piutang Lainnya", type: "Aset" },
        { name: "Piutang Usaha", type: "Aset" },
        { name: "Persediaan Sparepart", type: "Aset" },
        { name: "Perlengkapan Kantor", type: "Aset" },
        { name: "Peralatan Usaha", type: "Aset" },
        { name: "Utang Usaha", type: "Liabilitas" },
        { name: "Utang Bank", type: "Liabilitas" },
        { name: "Modal", type: "Ekuitas" },
        { name: "Pendapatan Jasa", type: "Pendapatan" },
        { name: "Pendapatan Penjualan", type: "Pendapatan" },
        { name: "Beban Gaji", type: "Beban" },
        { name: "Beban Transportasi", type: "Beban" },
        { name: "Beban Sewa", type: "Beban" },
        { name: "Beban Lainnya", type: "Beban" },
      ],
      kelompoks: [
        "Tim Yudi",
        "Tim Aziz",
        "Tim Sukma",
        "Tim Rafid",
        "Tim Arya",
        "Tim Dafa",
        "Tim Farel",
        "Tim P.Deni",
        "Proyek A",
        "Operasional Kantor",
      ],
    };
  },

  findLatestSettings() {
    const keys = Object.keys(localStorage).filter(
      (k) =>
        k.startsWith("accountingApp_") &&
        k !== `accountingApp_${state.currentMonth}`
    );
    if (keys.length === 0) return null;
    keys.sort().reverse();
    const latestData = localStorage.getItem(keys[0]);
    return latestData ? JSON.parse(latestData).settings : null;
  },

  findPreviousPeriodData(targetMonth) {
    const keys = Object.keys(localStorage).filter(
      (k) =>
        k.startsWith("accountingApp_") && k < `accountingApp_${targetMonth}`
    );

    if (keys.length === 0) return null;

    keys.sort().reverse();
    const latestKey = keys[0];

    const latestData = localStorage.getItem(latestKey);
    return latestData ? JSON.parse(latestData) : null;
  },

  calculateStockLevels(items, transactions) {
    // Helper local logic for stock calc, often needed during load
    const stockData = {};
    items.forEach((item) => {
      stockData[item.kode] = {
        nama: item.nama,
        stokAwal: item.stokAwal || 0,
        masuk: 0,
        keluar: 0,
        stokAkhir: 0,
      };
    });

    transactions.forEach((trx) => {
      if (stockData[trx.kode]) {
        if (trx.tipe === "masuk") stockData[trx.kode].masuk += trx.jumlah;
        else if (trx.tipe === "keluar")
          stockData[trx.kode].keluar += trx.jumlah;
      }
    });

    Object.keys(stockData).forEach((kode) => {
      const item = stockData[kode];
      item.stokAkhir = item.stokAwal + item.masuk - item.keluar;
    });

    return stockData;
  },

  loadData(month) {
    const dataKey = `accountingApp_${month}`;
    const data = localStorage.getItem(dataKey);

    state.currentMonth = month;

    if (data) {
      const parsedData = JSON.parse(data);
      state.jurnals = parsedData.jurnals || [];
      state.settings = parsedData.settings || this.getDefaultSettings();

      if (!state.settings.brands || state.settings.brands.length === 0) {
        delete state.settings.brands;
      }

      state.stock = parsedData.stock || { items: [], transactions: [] };
      if (!state.stock.items) state.stock = { items: [], transactions: [] };

      state.piutangs = (parsedData.piutangs || []).map((p) => ({
        ...p,
        payments: p.payments || [],
      }));
    } else {
      state.jurnals = [];

      // 1. Ambil setting terakhir
      const anySettings = this.findLatestSettings();
      state.settings = anySettings || this.getDefaultSettings();
      if (state.settings.brands) delete state.settings.brands;

      // 2. CARI DATA PERIODE SEBELUMNYA
      const prevData = this.findPreviousPeriodData(month);
      let notifMessage = "";

      // A. LOGIKA CARRY OVER PIUTANG
      state.piutangs = [];
      if (prevData && prevData.piutangs) {
        const unpaidPiutangs = prevData.piutangs.filter((p) => {
          const totalPaid = (p.payments || []).reduce(
            (sum, pay) => sum + pay.amount,
            0
          );
          return p.jumlah - totalPaid > 1;
        });

        if (unpaidPiutangs.length > 0) {
          state.piutangs = unpaidPiutangs.map((p) => ({ ...p }));
          notifMessage += `<li>${unpaidPiutangs.length} piutang belum lunas disalin dari periode sebelumnya.</li>`;
        }
      }

      // B. LOGIKA CARRY OVER STOCK
      if (prevData && prevData.stock && prevData.stock.items) {
        const prevStockLevels = this.calculateStockLevels(
          prevData.stock.items,
          prevData.stock.transactions
        );

        state.stock = {
          items: prevData.stock.items.map((item) => {
            const prevLevel = prevStockLevels[item.kode];
            const stokAkhirLalu = prevLevel
              ? prevLevel.stokAwal + prevLevel.masuk - prevLevel.keluar
              : item.stokAwal;

            return { ...item, stokAwal: stokAkhirLalu };
          }),
          transactions: [],
        };
        notifMessage += `<li>Stok awal disesuaikan dari akhir periode sebelumnya.</li>`;
      } else {
        state.stock = { items: [], transactions: [] };
      }

      if (notifMessage) {
        setTimeout(() => {
          utils.showModal(
            "Info Periode Baru",
            `<ul class="list-disc pl-5 space-y-1">${notifMessage}</ul>`
          );
        }, 500);
      }
    }
    this.saveData();
  },

  saveData() {
    const dataKey = `accountingApp_${state.currentMonth}`;
    const dataToSave = {
      jurnals: state.jurnals,
      settings: state.settings,
      stock: state.stock,
      piutangs: state.piutangs,
    };
    localStorage.setItem(dataKey, JSON.stringify(dataToSave));
    localStorage.setItem(
      "accountingApp_global",
      JSON.stringify({ activeTab: state.activeTab })
    );
  },

  resetData() {
    const dataKey = `accountingApp_${state.currentMonth}`;
    localStorage.removeItem(dataKey);
  },

  saveDataForCurrentMonth() {
    this.saveData();
    utils.showModal(
      "Sukses",
      `Data untuk periode ${utils.formatMonth(
        state.currentMonth
      )} telah berhasil disimpan.`
    );
  },

  exportData() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("accountingApp_")) {
        allData[key] = localStorage.getItem(key);
      }
    }
    if (Object.keys(allData).length === 0) {
      utils.showModal("Info", "Tidak ada data untuk diekspor.");
      return;
    }
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `data_akuntansi_backup_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    utils.showModal("Sukses", "Semua data telah berhasil diekspor.");
  },

  importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const importedData = JSON.parse(content);
          utils.showModal(
            "Konfirmasi Impor",
            `Anda akan mengimpor data dari file. Ini akan **MENGGANTI** semua data yang ada saat ini. Apakah Anda yakin?`,
            [
              {
                text: "Ya, Impor Sekarang",
                class: "bg-green-600 hover:bg-green-700",
                callback: () => {
                  Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith("accountingApp_")) {
                      localStorage.removeItem(key);
                    }
                  });
                  Object.entries(importedData).forEach(([key, value]) => {
                    if (key.startsWith("accountingApp_")) {
                      localStorage.setItem(key, value);
                    }
                  });
                  utils.closeModal();
                  window.location.reload();
                },
              },
              {
                text: "Batal",
                class: "bg-gray-600 hover:bg-gray-700",
                callback: () => utils.closeModal(),
              },
            ]
          );
        } catch (error) {
          utils.showModal(
            "Error",
            "Gagal membaca file. Pastikan file dalam format JSON yang benar."
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },
};
