const app = {
  state: {
    activeTab: "jurnal",
    currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    jurnals: [],
    settings: { akuns: [], kelompoks: [] }, // Hapus 'brands'
    stock: { items: [], transactions: [] }, // Struktur stok baru
    piutangs: [], // NEW: for receivables management
    apiKey: localStorage.getItem('gemini_api_key') || '',
  },
  chartInstance: null,

  init() {
    this.loadData(this.state.currentMonth);
    this.addEventListeners();
    this.changeTab(this.state.activeTab, true);
  },
  loadData(month) {
    const dataKey = `accountingApp_${month}`;
    const data = localStorage.getItem(dataKey);

    this.state.currentMonth = month;

    if (data) {
      // JIKA DATA BULAN INI SUDAH ADA, LOAD SEPERTI BIASA
      const parsedData = JSON.parse(data);
      this.state.jurnals = parsedData.jurnals || [];
      this.state.settings = parsedData.settings || this.getDefaultSettings();

      // Hapus logika 'brands' lama jika ada
      if (
        !this.state.settings.brands ||
        this.state.settings.brands.length === 0
      ) {
        delete this.state.settings.brands;
      }

      this.state.stock = parsedData.stock || { items: [], transactions: [] };
      if (!this.state.stock.items) {
        this.state.stock = { items: [], transactions: [] };
      }

      this.state.piutangs = (parsedData.piutangs || []).map((p) => ({
        ...p,
        payments: p.payments || [],
      }));
    } else {
      // JIKA DATA BULAN INI BELUM ADA (BULAN BARU)
      this.state.jurnals = [];
      this.state.piutangs = [];

      // 1. Ambil setting terakhir agar tidak perlu setting ulang
      const anySettings = this.findLatestSettings();
      this.state.settings = anySettings || this.getDefaultSettings();
      if (this.state.settings.brands) {
        delete this.state.settings.brands;
      }

      // 2. LOGIKA CARRY OVER STOCK (MEMBAWA STOK DARI PERIODE SEBELUMNYA)
      // Cari data stok dari bulan yang LEBIH KECIL dari bulan ini (masa lalu)
      const prevStock = this.findPreviousStockData(month);

      if (prevStock && prevStock.items) {
        // Hitung Stok Akhir bulan lalu
        const prevStockLevels = this.calculateStockLevels(
          prevStock.items,
          prevStock.transactions
        );

        // Buat daftar item untuk bulan ini
        this.state.stock = {
          items: prevStock.items.map((item) => {
            const prevLevel = prevStockLevels[item.kode];
            // Stok Awal bulan ini = Stok Akhir bulan lalu
            // Rumus: Stok Awal Lama + Masuk Lama - Keluar Lama
            const stokAkhirLalu = prevLevel
              ? prevLevel.stokAwal + prevLevel.masuk - prevLevel.keluar
              : item.stokAwal;

            return {
              ...item,
              stokAwal: stokAkhirLalu, // Set sebagai stok awal baru
            };
          }),
          transactions: [], // Transaksi di-reset (kosong) untuk bulan baru
        };

        // Tampilkan notifikasi kecil bahwa stok telah disesuaikan
        setTimeout(() => {
          this.showModal(
            "Info Periode Baru",
            `Data stok awal telah otomatis disesuaikan berdasarkan stok akhir dari periode sebelumnya.`
          );
        }, 500);
      } else {
        // Jika sama sekali tidak ada data masa lalu (pengguna baru)
        this.state.stock = { items: [], transactions: [] };
      }
    }
    this.saveData(); // Simpan state awal untuk bulan ini
  },

  findLatestSettings() {
    const keys = Object.keys(localStorage).filter(
      (k) =>
        k.startsWith("accountingApp_") &&
        k !== `accountingApp_${this.state.currentMonth}`
    );
    if (keys.length === 0) return null;
    keys.sort().reverse(); // Urutkan dari terbaru
    const latestData = localStorage.getItem(keys[0]);
    return latestData ? JSON.parse(latestData).settings : null;
  },

  // FUNGSI BARU (DIPERBARUI): Mengambil SELURUH data periode sebelumnya
  findPreviousPeriodData(targetMonth) {
    // Ambil semua key, filter yang bulannya KURANG DARI targetMonth
    // Contoh: Jika target "2023-02", maka ambil "2023-01", "2022-12", dst.
    const keys = Object.keys(localStorage).filter(
      (k) =>
        k.startsWith("accountingApp_") && k < `accountingApp_${targetMonth}`
    );

    if (keys.length === 0) return null;

    keys.sort().reverse(); // Urutkan agar yang paling mendekati (terbaru) ada di indeks 0
    const latestKey = keys[0]; // Ambil bulan terakhir yang tersedia

    const latestData = localStorage.getItem(latestKey);
    return latestData ? JSON.parse(latestData) : null;
  },

  // Hapus fungsi findPreviousStockData yang lama karena sudah diganti dengan yang lebih umum di atas
  /* findPreviousStockData(targetMonth) { ... } */

  // MODIFIKASI loadData untuk menggunakan findPreviousPeriodData
  loadData(month) {
    const dataKey = `accountingApp_${month}`;
    const data = localStorage.getItem(dataKey);

    this.state.currentMonth = month;

    if (data) {
      // JIKA DATA BULAN INI SUDAH ADA, LOAD SEPERTI BIASA
      const parsedData = JSON.parse(data);
      this.state.jurnals = parsedData.jurnals || [];
      this.state.settings = parsedData.settings || this.getDefaultSettings();

      if (
        !this.state.settings.brands ||
        this.state.settings.brands.length === 0
      ) {
        delete this.state.settings.brands;
      }

      this.state.stock = parsedData.stock || { items: [], transactions: [] };
      if (!this.state.stock.items) {
        this.state.stock = { items: [], transactions: [] };
      }

      this.state.piutangs = (parsedData.piutangs || []).map((p) => ({
        ...p,
        payments: p.payments || [],
      }));
    } else {
      // JIKA DATA BULAN INI BELUM ADA (BULAN BARU)
      this.state.jurnals = [];

      // 1. Ambil setting terakhir
      const anySettings = this.findLatestSettings();
      this.state.settings = anySettings || this.getDefaultSettings();
      if (this.state.settings.brands) {
        delete this.state.settings.brands;
      }

      // 2. CARI DATA PERIODE SEBELUMNYA
      const prevData = this.findPreviousPeriodData(month);
      let notifMessage = "";

      // A. LOGIKA CARRY OVER PIUTANG
      this.state.piutangs = [];
      if (prevData && prevData.piutangs) {
        // Filter hanya piutang yang BELUM LUNAS
        const unpaidPiutangs = prevData.piutangs.filter((p) => {
          const totalPaid = (p.payments || []).reduce(
            (sum, pay) => sum + pay.amount,
            0
          );
          return p.jumlah - totalPaid > 1; // Jika sisa hutang > 1 rupiah
        });

        if (unpaidPiutangs.length > 0) {
          // Salin data piutang (termasuk riwayat pembayaran sebelumnya) ke bulan baru
          this.state.piutangs = unpaidPiutangs.map((p) => ({ ...p }));
          notifMessage += `<li>${unpaidPiutangs.length} piutang belum lunas disalin dari periode sebelumnya.</li>`;
        }
      }

      // B. LOGIKA CARRY OVER STOCK
      if (prevData && prevData.stock && prevData.stock.items) {
        const prevStockLevels = this.calculateStockLevels(
          prevData.stock.items,
          prevData.stock.transactions
        );

        this.state.stock = {
          items: prevData.stock.items.map((item) => {
            const prevLevel = prevStockLevels[item.kode];
            const stokAkhirLalu = prevLevel
              ? prevLevel.stokAwal + prevLevel.masuk - prevLevel.keluar
              : item.stokAwal;

            return {
              ...item,
              stokAwal: stokAkhirLalu,
            };
          }),
          transactions: [],
        };
        notifMessage += `<li>Stok awal disesuaikan dari akhir periode sebelumnya.</li>`;
      } else {
        this.state.stock = { items: [], transactions: [] };
      }

      // Tampilkan notifikasi jika ada data yang dibawa
      if (notifMessage) {
        setTimeout(() => {
          this.showModal(
            "Info Periode Baru",
            `<ul class="list-disc pl-5 space-y-1">${notifMessage}</ul>`
          );
        }, 500);
      }
    }
    this.saveData();
  },

  getDefaultSettings() {
    return {
      akuns: [
        { name: "Kas", type: "Aset" },
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
        "Tim Rfaid",
        "Tim Arya",
        "Tim Dafa",
        "Tim Farel",
        "Tim P.Deni",
        "Proyek A",
        "Operasional Kantor",
      ],
      // 'brands' dihapus dari default settings
    };
  },
  saveData() {
    const dataKey = `accountingApp_${this.state.currentMonth}`;
    const dataToSave = {
      jurnals: this.state.jurnals,
      settings: this.state.settings,
      stock: this.state.stock,
      piutangs: this.state.piutangs,
    };
    localStorage.setItem(dataKey, JSON.stringify(dataToSave));
    localStorage.setItem(
      "accountingApp_global",
      JSON.stringify({ activeTab: this.state.activeTab })
    );
  },
  saveDataForCurrentMonth() {
    this.saveData();
    this.showModal(
      "Sukses",
      `Data untuk periode ${this.formatMonth(
        this.state.currentMonth
      )} telah berhasil disimpan.`
    );
  },
  resetData() {
    this.showModal(
      "Konfirmasi Reset",
      `Apakah Anda yakin ingin mereset semua data untuk periode <strong>${this.formatMonth(
        this.state.currentMonth
      )}</strong>? Tindakan ini tidak dapat dibatalkan.`,
      [
        {
          text: "Ya, Reset",
          class: "bg-red-600 hover:bg-red-700",
          callback: () => this.executeReset(),
        },
        {
          text: "Batal",
          class: "bg-gray-600 hover:bg-gray-700",
          callback: () => this.closeModal(),
        },
      ]
    );
  },
  executeReset() {
    const dataKey = `accountingApp_${this.state.currentMonth}`;
    localStorage.removeItem(dataKey);
    this.loadData(this.state.currentMonth);
    this.renderAll();
    this.changeTab("jurnal", true);
    this.showModal(
      "Sukses",
      `Data untuk periode ${this.formatMonth(
        this.state.currentMonth
      )} telah direset.`
    );
  },
  addEventListeners() {},
  addInputRow() {
    const tbody = document.getElementById("jurnal-input-body");
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
                <td class="p-1"><input type="text" class="input-keterangan" placeholder="Keterangan transaksi" required></td>
                <td class="p-1"><select class="input-akun-debit" required>${this.getAkunOptions(
                  true
                )}</select></td>
                <td class="p-1"><select class="input-akun-kredit" required>${this.getAkunOptions(
                  true
                )}</select></td>
                <td class="p-1"><input type="number" class="input-jumlah" placeholder="0" min="0" required></td>
                <td class="p-1 text-center"><button class="delete-row-btn text-gray-400 hover:text-red-500 p-2"><i class="fas fa-trash-alt"></i></button></td>
            `;
    tbody.appendChild(newRow);
  },
  saveJurnals() {
    const batchTanggal = document.getElementById("batch-tanggal").value;
    const batchKelompok = document.getElementById("batch-kelompok").value;
    let hasError = false;
    let wrongMonthError = false;

    if (!batchTanggal || !batchKelompok) {
      this.showModal(
        "Peringatan",
        "Tanggal dan Kelompok transaksi harus diisi terlebih dahulu."
      );
      document
        .getElementById("batch-tanggal")
        .classList.toggle("input-error", !batchTanggal);
      document
        .getElementById("batch-kelompok")
        .classList.toggle("input-error", !batchKelompok);
      return;
    } else {
      document.getElementById("batch-tanggal").classList.remove("input-error");
      document.getElementById("batch-kelompok").classList.remove("input-error");
    }

    if (batchTanggal.slice(0, 7) !== this.state.currentMonth) {
      wrongMonthError = true;
      document.getElementById("batch-tanggal").classList.add("input-error");
    }

    if (wrongMonthError) {
      this.showModal(
        "Peringatan",
        `Tanggal transaksi harus berada dalam periode aktif saat ini (${this.formatMonth(
          this.state.currentMonth
        )}).`
      );
      return;
    }

    const rows = document.querySelectorAll("#jurnal-input-body tr");
    const newJurnals = [];

    rows.forEach((row) =>
      row
        .querySelectorAll("input, select")
        .forEach((el) => el.classList.remove("input-error"))
    );

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
      this.showModal(
        "Peringatan",
        "Beberapa baris tidak lengkap. Pastikan semua kolom yang diperlukan terisi dengan benar."
      );
      return;
    }

    if (validRows.length === 0) {
      this.showModal("Info", "Tidak ada data valid untuk disimpan.");
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

    this.state.jurnals.push(...newJurnals);
    this.saveData();
    this.renderJurnalTable();
    document.getElementById("jurnal-input-body").innerHTML = "";
    this.addInputRow();
    this.showModal(
      "Sukses",
      `${
        validRows.length
      } transaksi berhasil disimpan untuk periode ${this.formatMonth(
        this.state.currentMonth
      )}!`
    );
  },
  deleteJurnal(noBukti) {
    this.showModal(
      "Konfirmasi Hapus",
      `Yakin ingin menghapus semua entri untuk transaksi ini?`,
      [
        {
          text: "Ya, Hapus",
          class: "bg-red-600 hover:bg-red-700",
          callback: () => this.executeDelete(noBukti),
        },
        {
          text: "Batal",
          class: "bg-gray-600 hover:bg-gray-700",
          callback: () => this.closeModal(),
        },
      ]
    );
  },
  executeDelete(noBukti) {
    this.state.jurnals = this.state.jurnals.filter(
      (j) => j.noBukti !== noBukti
    );
    this.saveData();
    this.renderAll();
    this.showModal("Sukses", `Transaksi ${noBukti} dihapus.`);
  },
  addAkun() {
    const nameInput = document.getElementById("new-akun-name");
    const typeInput = document.getElementById("new-akun-tipe");
    const name = nameInput.value.trim();
    if (!name) return;
    if (
      this.state.settings.akuns.some(
        (a) => a.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      this.showModal("Peringatan", "Nama akun sudah ada.");
      return;
    }
    this.state.settings.akuns.push({ name, type: typeInput.value });
    this.saveData();
    this.renderPengaturan();
    this.populateDropdowns();
    nameInput.value = "";
    this.showModal("Sukses", "Akun baru berhasil ditambahkan.");
  },
  deleteAkun(name) {
    this.showModal(
      "Konfirmasi Hapus",
      `Hapus akun "${name}"? Ini tidak akan menghapus transaksi yang sudah ada yang menggunakan akun ini.`,
      [
        {
          text: "Ya, Hapus",
          class: "bg-red-600 hover:bg-red-700",
          callback: () => {
            this.state.settings.akuns = this.state.settings.akuns.filter(
              (a) => a.name !== name
            );
            this.saveData();
            this.renderPengaturan();
            this.populateDropdowns();
            this.closeModal();
          },
        },
        {
          text: "Batal",
          class: "bg-gray-600 hover:bg-gray-700",
          callback: () => this.closeModal(),
        },
      ]
    );
  },
  addKelompok() {
    const nameInput = document.getElementById("new-kelompok-name");
    const name = nameInput.value.trim();
    if (!name) return;
    if (
      this.state.settings.kelompoks.some(
        (k) => k.toLowerCase() === name.toLowerCase()
      )
    ) {
      this.showModal("Peringatan", "Nama kelompok sudah ada.");
      return;
    }
    this.state.settings.kelompoks.push(name);
    this.saveData();
    this.renderPengaturan();
    this.populateDropdowns();
    nameInput.value = "";
    this.showModal("Sukses", "Kelompok baru berhasil ditambahkan.");
  },
  deleteKelompok(name) {
    this.showModal("Konfirmasi Hapus", `Hapus kelompok "${name}"?`, [
      {
        text: "Ya, Hapus",
        class: "bg-red-600 hover:bg-red-700",
        callback: () => {
          this.state.settings.kelompoks = this.state.settings.kelompoks.filter(
            (k) => k !== name
          );
          this.saveData();
          this.renderPengaturan();
          this.populateDropdowns();
          this.closeModal();
        },
      },
      {
        text: "Batal",
        class: "bg-gray-600 hover:bg-gray-700",
        callback: () => this.closeModal(),
      },
    ]);
  },
  addBrand() {
    // Fungsi ini tidak lagi digunakan
    this.showModal(
      "Info",
      "Fungsi 'Brand' telah digantikan oleh 'Jurnal Stok'."
    );
  },
  deleteBrand(name) {
    // Fungsi ini tidak lagi digunakan
  },
  renderAll() {
    const tab = this.state.activeTab;
    if (tab === "jurnal") this.renderJurnalTab();
    else if (tab === "bukuBesar") this.renderBukuBesarTab();
    else if (tab === "labaRugi") this.renderLabaRugiTab();
    else if (tab === "pengaturan") this.renderPengaturanTab();
    else if (tab === "neraca") this.renderNeracaTab();
    else if (tab === "arusKas") this.renderArusKasTab();
    else if (tab === "dataPiutang") this.renderDataPiutangTab();
    else if (tab === "stockBarang") this.renderStockBarangTab();
  },
  changeTab(tabName, forceRender = false) {
    if (this.state.activeTab === tabName && !forceRender) return;
    this.state.activeTab = tabName;
    document
      .querySelectorAll(".tab-content")
      .forEach((tab) => tab.classList.add("hidden"));
    document.getElementById(`${tabName}-tab`).classList.remove("hidden");
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.remove("active");
      if (button.dataset.tab === tabName) button.classList.add("active");
    });
    this.renderAll();
    this.saveData();
  },
  populateDropdowns() {
    if (document.getElementById("bb-akun-select")) {
      document.getElementById("bb-akun-select").innerHTML =
        this.getAkunOptions(true);
      document.getElementById("bb-kelompok-filter").innerHTML =
        this.getKelompokOptions(true, "Semua Kelompok");
    }
    if (document.getElementById("lr-kelompok-filter")) {
      document.getElementById("lr-kelompok-filter").innerHTML =
        this.getKelompokOptions(true, "Semua Kelompok");
    }
  },
  getAkunOptions(includePlaceholder = false) {
    let options = includePlaceholder
      ? '<option value="">-- Pilih Akun --</option>'
      : "";
    this.state.settings.akuns
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((akun) => {
        options += `<option value="${akun.name}">${akun.name}</option>`;
      });
    return options;
  },
  getKelompokOptions(
    includePlaceholder = false,
    placeholderText = "-- Pilih Kelompok --"
  ) {
    let options = includePlaceholder
      ? `<option value="">-- ${placeholderText} --</option>`
      : "";
    this.state.settings.kelompoks.sort().forEach((k) => {
      options += `<option value="${k}">${k}</option>`;
    });
    return options;
  },
  renderJurnalTab() {
    const container = document.getElementById("jurnal-tab");
    const defaultDate = new Date(this.state.currentMonth + "-02")
      .toISOString()
      .split("T")[0];
    container.innerHTML = `
                <div class="mb-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md" role="alert">
                    <p class="font-bold">Periode Aktif: ${this.formatMonth(
                      this.state.currentMonth
                    )}</p>
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
                                ${this.getKelompokOptions(
                                  true,
                                  "Pilih Kelompok"
                                )}
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
                    <h2 class="text-xl font-semibold mb-4">Daftar Jurnal (Riwayat Transaksi)</h2>
                    <div id="jurnal-list-container" class="space-y-4"></div>
                </section>`;
    this.renderJurnalTable();
    this.addInputRow();
    document
      .getElementById("add-row-btn")
      .addEventListener("click", () => this.addInputRow());
    document
      .getElementById("save-jurnals-btn")
      .addEventListener("click", () => this.saveJurnals());
    document
      .getElementById("jurnal-input-body")
      .addEventListener("click", (e) => {
        if (e.target.closest(".delete-row-btn"))
          e.target.closest("tr").remove();
      });
  },
  renderJurnalTable() {
    const container = document.getElementById("jurnal-list-container");
    if (!container) return;
    container.innerHTML = "";
    const groupedJurnals = this.state.jurnals.reduce((acc, j) => {
      (acc[j.noBukti] = acc[j.noBukti] || []).push(j);
      return acc;
    }, {});

    const sortedNoBukti = Object.keys(groupedJurnals).sort((a, b) => {
      const dateA = new Date(groupedJurnals[a][0].tanggal);
      const dateB = new Date(groupedJurnals[b][0].tanggal);
      return dateB - dateA;
    });

    if (sortedNoBukti.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-gray-500">Belum ada jurnal yang tersimpan untuk periode ${this.formatMonth(
        this.state.currentMonth
      )}.</div>`;
      return;
    }

    sortedNoBukti.forEach((noBukti) => {
      const entries = groupedJurnals[noBukti];
      const firstEntry = entries[0];
      let tableRows = "";
      const transactionsByKeterangan = entries.reduce((acc, j) => {
        if (!acc[j.keterangan]) {
          acc[j.keterangan] = {
            debit: 0,
            kredit: 0,
            akunDebit: "",
            akunKredit: "",
          };
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
                            <div class="text-xs text-gray-500 italic">${
                              trx.akunDebit
                            } (D) -> ${trx.akunKredit} (K)</div>
                        </td>
                        <td class="px-4 py-2 text-sm text-right">${this.formatCurrency(
                          trx.debit
                        )}</td>
                        <td class="px-4 py-2 text-sm text-right">${this.formatCurrency(
                          trx.kredit
                        )}</td>
                    </tr>`;
      });

      const groupHtml = `
                <div class="border rounded-lg overflow-hidden">
                    <div class="bg-gray-50 p-3 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <p class="font-semibold text-gray-800">${
                              firstEntry.noBukti
                            }</p>
                            <p class="text-sm text-gray-500">${
                              firstEntry.tanggal
                            } | Kelompok: ${
        firstEntry.kelompok || "Lainnya"
      }</p>
                        </div>
                         <div class="flex items-center gap-2">
                            <button onclick="app.analyzeTransaction(event, '${noBukti}')" class="gemini-button inline-flex items-center text-xs py-1 px-3 border border-transparent shadow-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
                                <i class="fas fa-magic mr-1"></i> <span class="btn-text">Analisis</span> <i class="fas fa-spinner fa-spin"></i>
                            </button>
                            <button onclick="app.deleteJurnal('${noBukti}')" class="text-gray-400 hover:text-red-600 text-xs py-1 px-2"><i class="fas fa-trash"></i></button>
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
  },
  renderBukuBesarTab() {
    const container = document.getElementById("bukuBesar-tab");
    container.innerHTML = `
            <section class="bg-white p-6 rounded-lg shadow-sm">
                <h2 class="text-xl font-semibold mb-2">Buku Besar</h2>
                <p class="text-sm text-gray-500 mb-4">Pilih sebuah akun dan kelompok untuk melihat riwayat lengkap transaksinya dan saldo akhirnya untuk periode <strong>${this.formatMonth(
                  this.state.currentMonth
                )}</strong>.</p>
                <div class="flex flex-wrap gap-4 mb-4 items-end bg-gray-50 p-4 rounded-md">
                    <div> <label for="bb-kelompok-filter" class="block text-sm font-medium text-gray-700">Filter Kelompok</label> <select id="bb-kelompok-filter" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></select> </div>
                    <div> <label for="bb-akun-select" class="block text-sm font-medium text-gray-700">Pilih Akun</label> <select id="bb-akun-select" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></select> </div>
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
    this.populateDropdowns();
    this.renderBukuBesar();
    document
      .getElementById("bb-akun-select")
      .addEventListener("change", () => this.renderBukuBesar());
    document
      .getElementById("bb-kelompok-filter")
      .addEventListener("change", () => this.renderBukuBesar());
  },
  renderBukuBesar() {
    const tbody = document.getElementById("bukuBesar-table-body");
    const akunName = document.getElementById("bb-akun-select").value;
    const kelompokFilter = document.getElementById("bb-kelompok-filter").value;
    tbody.innerHTML = "";
    if (!akunName) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Silakan pilih akun untuk ditampilkan.</td></tr>`;
      return;
    }
    const transactions = this.state.jurnals
      .filter(
        (j) =>
          j.akun === akunName &&
          (!kelompokFilter || j.kelompok === kelompokFilter)
      )
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal) || a.id - b.id);
    if (transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Tidak ada transaksi untuk filter ini.</td></tr>`;
      return;
    }
    let saldo = 0;
    transactions.forEach((trx) => {
      saldo += trx.debit - trx.kredit;
      tbody.innerHTML += `<tr><td class="px-6 py-4 whitespace-nowrap text-sm">${
        trx.tanggal
      }</td><td class="px-6 py-4 whitespace-nowrap text-sm">${
        trx.keterangan
      }</td><td class="px-6 py-4 whitespace-nowrap text-sm text-right">${this.formatCurrency(
        trx.debit
      )}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-right">${this.formatCurrency(
        trx.kredit
      )}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">${this.formatCurrency(
        saldo
      )}</td></tr>`;
    });
  },
  renderLabaRugiTab() {
    const container = document.getElementById("labaRugi-tab");
    container.innerHTML = `
                 <section class="bg-white p-6 rounded-lg shadow-sm">
                    <h2 class="text-xl font-semibold mb-2">Laporan Laba Rugi</h2>
                    <p class="text-sm text-gray-500 mb-4">Laporan untuk periode <strong>${this.formatMonth(
                      this.state.currentMonth
                    )}</strong>. Gunakan filter untuk analisis yang lebih spesifik.</p>
                    <div class="flex flex-wrap gap-4 mb-6 items-end bg-gray-50 p-4 rounded-md">
                        <div> <label for="lr-kelompok-filter" class="block text-sm font-medium text-gray-700">Filter Kelompok</label> <select id="lr-kelompok-filter" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></select> </div>
                        <div> <label for="lr-start-date" class="block text-sm font-medium text-gray-700">Dari Tanggal</label> <input type="date" id="lr-start-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"> </div>
                        <div> <label for="lr-end-date" class="block text-sm font-medium text-gray-700">Sampai Tanggal</label> <input type="date" id="lr-end-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"> </div>
                        <button onclick="app.renderLabaRugi()" class="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Tampilkan</button>
                    </div>
                    <div id="labaRugi-container">
                        <button id="analyze-lr-btn" onclick="app.analyzeLabaRugi(event)" class="gemini-button mb-4 w-full sm:w-auto inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
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
    this.populateDropdowns();
    this.renderLabaRugi();
  },
  renderLabaRugi() {
    const container = document.getElementById("labaRugi-content");
    const {
      pendapatanDetails,
      bebanDetails,
      totalPendapatan,
      totalBeban,
      labaBersih,
    } = this.calculateFinancials();
    let html = `<div class="space-y-6">`;
    const createSection = (title, details, total) => {
      let sectionHtml = `<div><h3 class="text-lg font-semibold border-b pb-2 mb-2">${title}</h3><dl class="space-y-1">`;
      Object.entries(details)
        .filter(([, val]) => val !== 0)
        .forEach(([akun, jumlah]) => {
          sectionHtml += `<div class="flex justify-between text-sm"><dt class="text-gray-600">${akun}</dt><dd>${this.formatCurrency(
            jumlah
          )}</dd></div>`;
        });
      sectionHtml += `</dl><div class="flex justify-between font-bold border-t pt-2 mt-2"><dt>Total ${title}</dt><dd>${this.formatCurrency(
        total
      )}</dd></div></div>`;
      return sectionHtml;
    };
    html += createSection("Pendapatan", pendapatanDetails, totalPendapatan);
    html += createSection("Beban", bebanDetails, totalBeban);
    html += `<div class="flex justify-between text-xl font-bold border-t-2 border-gray-900 pt-3 mt-4"><dt>LABA (RUGI) BERSIH</dt><dd class="${
      labaBersih >= 0 ? "text-green-600" : "text-red-600"
    }">${this.formatCurrency(labaBersih)}</dd></div></div>`;
    container.innerHTML = html;
    this.renderBebanChart(bebanDetails);
  },
  renderBebanChart(bebanDetails) {
    const ctx = document.getElementById("bebanChart").getContext("2d");
    const filteredBeban = Object.entries(bebanDetails).filter(
      ([, val]) => val > 0
    );
    const labels = filteredBeban.map(([key]) =>
      key.length > 16 ? key.substring(0, 16) + "..." : key
    );
    const data = filteredBeban.map(([, val]) => val);
    if (this.chartInstance) this.chartInstance.destroy();
    if (data.length === 0) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = "16px Inter";
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "center";
      ctx.fillText(
        "Tidak ada data beban untuk ditampilkan.",
        ctx.canvas.width / 2,
        ctx.canvas.height / 2
      );
      return;
    }
    this.chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            label: "Komposisi Beban",
            data,
            backgroundColor: [
              "#3b82f6",
              "#ef4444",
              "#f97316",
              "#84cc16",
              "#14b8a6",
              "#a855f7",
              "#ec4899",
            ],
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
      },
    });
  },
  renderPengaturanTab() {
    const container = document.getElementById("pengaturan-tab");
    container.innerHTML = `
                <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                        <h3 class="text-lg font-semibold mb-4">Konfigurasi Sistem</h3>
                
                        <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <h4 class="font-medium text-blue-900 mb-2"><i class="fas fa-key mr-2"></i>Google Gemini API Key</h4>
                            <p class="text-xs text-blue-700 mb-3">
                                Kunci API diperlukan untuk fitur Analisis AI. Kunci akan disimpan aman di browser Anda (Local Storage) dan tidak akan disebarkan.
                            </p>
                            <div class="flex gap-2">
                                <input type="password" id="settings-api-key" 
                                    class="flex-grow block w-full rounded-md border-gray-300 shadow-sm text-sm" 
                                    placeholder="Tempel API Key di sini (AIza...)"
                                    value="${this.state.apiKey}">
                                <button onclick="app.saveApiKey()" 
                                    class="py-2 px-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    Simpan
                                </button>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">
                                Belum punya kunci? <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 underline">Dapatkan di sini</a>.
                            </p>
                        </div>
                        <div class="space-y-6">
                            <div>
                                <h4 class="font-medium mb-2">Daftar Akun</h4>
                                <form id="add-akun-form" class="flex gap-2 mb-4">
                                    <input type="text" id="new-akun-name" placeholder="Nama Akun Baru" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm" required>
                                    <select id="new-akun-tipe" class="rounded-md border-gray-300 shadow-sm"> <option value="Aset">Aset</option><option value="Liabilitas">Liabilitas</option><option value="Ekuitas">Ekuitas</option><option value="Pendapatan">Pendapatan</option><option value="Beban">Beban</option> </select>
                                    <button type="submit" class="py-2 px-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus"></i></button>
                                </form>
                                <ul id="akun-list" class="space-y-2 max-h-40 overflow-y-auto pr-2"></ul>
                            </div>
                            <div>
                                <h4 class="font-medium mb-2">Daftar Kelompok</h4>
                                <form id="add-kelompok-form" class="flex gap-2 mb-4">
                                    <input type="text" id="new-kelompok-name" placeholder="Nama Kelompok Baru" class="flex-grow block w-full rounded-md border-gray-300 shadow-sm" required>
                                    <button type="submit" class="py-2 px-3 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus"></i></button>
                                </form>
                                <ul id="kelompok-list" class="space-y-2 max-h-40 overflow-y-auto pr-2"></ul>
                            </div>
                             <!-- Bagian 'Daftar Merek Stok' dihapus -->
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                         <h3 class="text-lg font-semibold mb-2">Manajemen Data</h3>
                         <div class="mb-4 bg-gray-100 p-3 rounded-md text-center">
                            <p class="text-sm text-gray-600">Periode Data Aktif:</p> <p class="font-bold text-gray-800">${this.formatMonth(
                              this.state.currentMonth
                            )}</p>
                         </div>
                         <div class="space-y-4">
                             <button onclick="app.saveDataForCurrentMonth()" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-save mr-3 text-lg text-blue-500"></i> <div> <span>Simpan Data Bulan Ini</span> <span class="block text-xs text-gray-500">Simpan progres untuk periode aktif saat ini.</span> </div> </button>
                             <button onclick="app.showLoadModal()" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-folder-open mr-3 text-lg text-yellow-500"></i> <div> <span>Muat Data Bulan Lain</span> <span class="block text-xs text-gray-500">Buka dan kelola data dari periode lain.</span> </div> </button>
                             <button onclick="app.generatePDF()" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-file-pdf mr-3 text-lg text-red-500"></i> <div> <span>Download Laporan PDF</span> <span class="block text-xs text-gray-500">Buat file PDF untuk periode aktif saat ini.</span> </div> </button>
                            <div class="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                                <button onclick="app.importData()" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-upload mr-3 text-lg text-green-500"></i> <div> <span>Impor Data</span> <span class="block text-xs text-gray-500">Muat data dari file.</span> </div> </button>
                                <button onclick="app.exportData()" class="w-full text-left flex items-center py-3 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"> <i class="fas fa-download mr-3 text-lg text-indigo-500"></i> <div> <span>Ekspor Data</span> <span class="block text-xs text-gray-500">Simpan semua data ke file.</span> </div> </button>
                            </div>
                            <button onclick="app.resetData()" class="w-full text-left flex items-center py-3 px-4 border border-red-200 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"> <i class="fas fa-trash-alt mr-3 text-lg"></i> <div> <span>Reset Data Bulan Ini</span> <span class="block text-xs text-gray-500">Hapus semua transaksi untuk periode aktif.</span> </div> </button>
                         </div>
                    </div>
                </section>`;
    this.renderPengaturan();
    document.getElementById("add-akun-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addAkun();
    });
    document
      .getElementById("add-kelompok-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.addKelompok();
      });
    /* Menghapus listener untuk 'add-brand-form-settings' yang sudah tidak ada
          document
      .getElementById("add-brand-form-settings")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        // Hapus logika event listener lama
        this.showModal("Info", "Silakan kelola item stok dari tab 'Stock Barang'.");
      });
      */
  },
  renderPengaturan() {
    const akunList = document.getElementById("akun-list");
    if (!akunList) return;
    akunList.innerHTML = "";
    this.state.settings.akuns
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((akun) => {
        akunList.innerHTML += `<li class="flex justify-between items-center bg-gray-50 p-2 rounded-md"><div>${akun.name}<span class="text-xs text-gray-500 ml-2 px-1.5 py-0.5 bg-gray-200 rounded-full">${akun.type}</span></div><button onclick="app.deleteAkun('${akun.name}')" class="text-gray-400 hover:text-red-500 text-xs"><i class="fas fa-times-circle"></i></button></li>`;
      });
    const kelompokList = document.getElementById("kelompok-list");
    kelompokList.innerHTML = "";
    this.state.settings.kelompoks.sort().forEach((k) => {
      kelompokList.innerHTML += `<li class="flex justify-between items-center bg-gray-50 p-2 rounded-md"><span>${k}</span><button onclick="app.deleteKelompok('${k}')" class="text-gray-400 hover:text-red-500 text-xs"><i class="fas fa-times-circle"></i></button></li>`;
    });
    // Hapus logika untuk render 'brand-list-settings'
    const brandList = document.getElementById("brand-list-settings");
    if (brandList) {
      brandList.closest("div").remove(); // Hapus seluruh div parent
    }
  },
   // FUNGSI BARU: MENYIMPAN API KEY
        saveApiKey() {
            const input = document.getElementById('settings-api-key');
            const key = input.value.trim();
            
            if (key) {
                localStorage.setItem('gemini_api_key', key);
                this.state.apiKey = key;
                this.showModal("Sukses", "API Key berhasil disimpan di browser ini.");
            } else {
                localStorage.removeItem('gemini_api_key');
                this.state.apiKey = '';
                this.showModal("Info", "API Key dihapus dari penyimpanan browser.");
            }
        },
  // NEW TABS START HERE
  calculateFinancials(jurnals = this.state.jurnals) {
    const pendapatanAkuns = this.state.settings.akuns.filter(
      (a) => a.type === "Pendapatan"
    );
    const bebanAkuns = this.state.settings.akuns.filter(
      (a) => a.type === "Beban"
    );
    const calcTotal = (akuns, type) =>
      akuns.reduce((acc, curr) => {
        acc[curr.name] = jurnals
          .filter((j) => j.akun === curr.name)
          .reduce(
            (sum, j) =>
              sum +
              (type === "Pendapatan" ||
              type === "Liabilitas" ||
              type === "Ekuitas"
                ? j.kredit - j.debit
                : j.debit - j.kredit),
            0
          );
        return acc;
      }, {});
    const pendapatanDetails = calcTotal(pendapatanAkuns, "Pendapatan");
    const bebanDetails = calcTotal(bebanAkuns, "Beban");
    const totalPendapatan = Object.values(pendapatanDetails).reduce(
      (s, v) => s + v,
      0
    );
    const totalBeban = Object.values(bebanDetails).reduce((s, v) => s + v, 0);
    const labaBersih = totalPendapatan - totalBeban;
    return {
      pendapatanDetails,
      bebanDetails,
      totalPendapatan,
      totalBeban,
      labaBersih,
    };
  },
  renderNeracaTab() {
    const container = document.getElementById("neraca-tab");
    const { labaBersih } = this.calculateFinancials();
    const getAkunSaldo = (tipe, saldoNormal) => {
      return this.state.settings.akuns
        .filter((a) => a.type === tipe)
        .map((akun) => {
          const saldo = this.state.jurnals
            .filter((j) => j.akun === akun.name)
            .reduce(
              (sum, j) =>
                sum +
                (saldoNormal === "debit"
                  ? j.debit - j.kredit
                  : j.kredit - j.debit),
              0
            );
          return { name: akun.name, saldo };
        })
        .filter((a) => a.saldo !== 0);
    };
    const aset = getAkunSaldo("Aset", "debit");
    const liabilitas = getAkunSaldo("Liabilitas", "kredit");
    const ekuitas = getAkunSaldo("Ekuitas", "kredit");
    const totalAset = aset.reduce((sum, a) => sum + a.saldo, 0);
    let totalEkuitas =
      ekuitas.reduce((sum, a) => sum + a.saldo, 0) + labaBersih;
    const totalLiabilitas = liabilitas.reduce((sum, a) => sum + a.saldo, 0);
    const totalPasiva = totalLiabilitas + totalEkuitas;
    const createTableRows = (items) =>
      items
        .map(
          (item) =>
            `<div class="flex justify-between text-sm py-1 border-b border-gray-100"><dt class="text-gray-600">${
              item.name
            }</dt><dd>${this.formatCurrency(item.saldo)}</dd></div>`
        )
        .join("");
    container.innerHTML = `
                 <section class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h2 class="text-xl font-semibold">Laporan Posisi Keuangan (Neraca)</h2>
                            <p class="text-sm text-gray-500 mb-4">Posisi keuangan untuk periode berakhir pada <strong>${this.formatMonth(
                              this.state.currentMonth
                            )}</strong>.</p>
                        </div>
                        <button onclick="app.analyzeNeraca(event)" class="gemini-button inline-flex items-center text-sm py-2 px-4 border border-transparent shadow-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
                            <i class="fas fa-magic mr-2"></i><span class="btn-text">Analisis Gemini</span><i class="fas fa-spinner fa-spin"></i>
                        </button>
                    </div>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div>
                             <h3 class="text-lg font-semibold border-b pb-2 mb-2 text-blue-700">Aktiva</h3>
                             <dl class="space-y-1">${createTableRows(aset)}</dl>
                             <div class="flex justify-between font-bold border-t-2 pt-2 mt-2"> <dt>Total Aktiva</dt> <dd>${this.formatCurrency(
                               totalAset
                             )}</dd> </div>
                         </div>
                         <div>
                             <h3 class="text-lg font-semibold border-b pb-2 mb-2 text-green-700">Pasiva</h3>
                             <h4 class="font-medium mt-4 mb-1">Liabilitas</h4>
                             <dl class="space-y-1">${createTableRows(
                               liabilitas
                             )}</dl>
                             <div class="flex justify-between font-semibold border-t pt-2 mt-2"> <dt>Total Liabilitas</dt> <dd>${this.formatCurrency(
                               totalLiabilitas
                             )}</dd> </div>
                             <h4 class="font-medium mt-4 mb-1">Ekuitas</h4>
                             <dl class="space-y-1">
                                ${createTableRows(ekuitas)}
                                <div class="flex justify-between text-sm py-1"> <dt class="text-gray-600">Laba (Rugi) Periode Ini</dt> <dd>${this.formatCurrency(
                                  labaBersih
                                )}</dd> </div>
                             </dl>
                             <div class="flex justify-between font-semibold border-t pt-2 mt-2"> <dt>Total Ekuitas</dt> <dd>${this.formatCurrency(
                               totalEkuitas
                             )}</dd> </div>
                             <div class="flex justify-between font-bold border-t-2 pt-2 mt-4"> <dt>Total Pasiva</dt> <dd>${this.formatCurrency(
                               totalPasiva
                             )}</dd> </div>
                         </div>
                     </div>
                     <div class="mt-8 text-center p-4 rounded-md ${
                       Math.abs(totalAset - totalPasiva) < 0.01
                         ? "bg-green-100 text-green-800"
                         : "bg-red-100 text-red-800"
                     }">
                         <p class="font-bold">${
                           Math.abs(totalAset - totalPasiva) < 0.01
                             ? '<i class="fas fa-check-circle mr-2"></i>SEIMBANG'
                             : '<i class="fas fa-exclamation-triangle mr-2"></i>TIDAK SEIMBANG'
                         }</p>
                     </div>
                 </section>
            `;
  },
  renderArusKasTab() {
    const container = document.getElementById("arusKas-tab");

    // 1. Mengelompokkan transaksi berdasarkan NoBukti
    const grouped = this.state.jurnals.reduce((acc, curr) => {
      if (!acc[curr.noBukti]) acc[curr.noBukti] = [];
      acc[curr.noBukti].push(curr);
      return acc;
    }, {});

    const cashAccounts = ["Kas", "Bank", "Kas Kecil"];

    const activities = {
      operasi: [],
      investasi: [],
      pendanaan: [],
    };

    let totalOperasi = 0;
    let totalInvestasi = 0;
    let totalPendanaan = 0;

    // 2. Menganalisis setiap grup transaksi
    Object.values(grouped).forEach((group) => {
      // Hitung perubahan bersih kas dalam transaksi ini
      let cashChange = 0;
      group.forEach((entry) => {
        if (cashAccounts.includes(entry.akun)) {
          cashChange += entry.debit - entry.kredit;
        }
      });

      if (Math.abs(cashChange) < 0.01) return; // Abaikan transaksi non-kas atau transfer internal kas

      // Cari akun lawan (non-kas) untuk menentukan kategori
      const contraEntries = group.filter(
        (entry) => !cashAccounts.includes(entry.akun)
      );

      if (contraEntries.length > 0) {
        // Ambil akun lawan pertama sebagai representasi kategori
        const contra = contraEntries[0];
        const akunName = contra.akun;
        // Gabungkan keterangan jika ada banyak, atau ambil yang pertama
        const description = contra.keterangan || "Transaksi Kas";

        // --- Logika Kategorisasi ---
        let category = "operasi";

        // Kata kunci Investasi (Aset Tetap)
        if (
          /peralatan|kendaraan|gedung|tanah|mesin|investasi/i.test(akunName)
        ) {
          category = "investasi";
        }
        // Kata kunci Pendanaan (Ekuitas & Utang Jangka Panjang)
        else if (/modal|prive|bank|pinjaman|deviden/i.test(akunName)) {
          // Pengecualian: "Beban Admin Bank" adalah Operasi, bukan Pendanaan
          if (akunName.includes("Beban") || akunName.includes("Biaya")) {
            category = "operasi";
          } else {
            category = "pendanaan";
          }
        }
        // Sisanya (Pendapatan, Beban, Utang Usaha, Piutang) masuk Operasi

        // Tambahkan ke daftar
        const item = {
          keterangan: `${description} (${akunName})`,
          jumlah: cashChange,
        };

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
                  <span class="${
                    item.jumlah >= 0 ? "text-gray-900" : "text-red-600"
                  } font-medium">
                      ${
                        item.jumlah < 0
                          ? "(" +
                            this.formatCurrency(Math.abs(item.jumlah)) +
                            ")"
                          : this.formatCurrency(item.jumlah)
                      }
                  </span>
              </div>
          `;

    const renderSection = (title, items, total) => `
              <div class="mb-8">
                  <h3 class="text-lg font-bold text-gray-800 mb-3 pb-2 border-b-2 border-gray-100">${title}</h3>
                  <div class="bg-white rounded-lg border border-gray-200 p-2 mb-3 shadow-sm">
                      ${
                        items.length > 0
                          ? items.map(formatItem).join("")
                          : '<p class="text-gray-400 text-sm italic p-3 text-center">Tidak ada aktivitas pada periode ini.</p>'
                      }
                  </div>
                  <div class="flex justify-between items-center font-bold text-gray-900 px-4 py-2 bg-gray-50 rounded-md">
                      <span>Total ${title}</span>
                      <span class="${
                        total < 0 ? "text-red-600" : "text-green-700"
                      } text-lg">
                           ${
                             total < 0
                               ? "(" +
                                 this.formatCurrency(Math.abs(total)) +
                                 ")"
                               : this.formatCurrency(total)
                           }
                      </span>
                  </div>
              </div>
          `;

    const netCashFlow = totalOperasi + totalInvestasi + totalPendanaan;

    container.innerHTML = `
              <section class="bg-white p-8 rounded-xl shadow-lg max-w-5xl mx-auto border border-gray-100">
                  <div class="text-center mb-10 pb-6 border-b border-gray-200">
                      <h2 class="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan Arus Kas</h2>
                      <p class="text-gray-500 mt-2 text-lg">Periode: <span class="font-medium text-blue-600">${this.formatMonth(
                        this.state.currentMonth
                      )}</span></p>
                  </div>

                  <div class="space-y-2">
                      ${renderSection(
                        "Arus Kas dari Aktivitas Operasi",
                        activities.operasi,
                        totalOperasi
                      )}
                      ${renderSection(
                        "Arus Kas dari Aktivitas Investasi",
                        activities.investasi,
                        totalInvestasi
                      )}
                      ${renderSection(
                        "Arus Kas dari Aktivitas Pendanaan",
                        activities.pendanaan,
                        totalPendanaan
                      )}
                  </div>

                  <div class="mt-10 pt-6 border-t-4 border-gray-100">
                      <div class="flex justify-between items-center text-xl sm:text-2xl font-bold bg-green-50 p-6 rounded-xl border border-green-100">
                          <span class="text-green-900">Perubahan Bersih Kas</span>
                          <span class="${
                            netCashFlow >= 0 ? "text-green-700" : "text-red-600"
                          }">
                              ${
                                netCashFlow < 0
                                  ? "(" +
                                    this.formatCurrency(Math.abs(netCashFlow)) +
                                    ")"
                                  : this.formatCurrency(netCashFlow)
                              }
                          </span>
                      </div>
                  </div>
              </section>
          `;
  },
  renderDataPiutangTab() {
    const container = document.getElementById("dataPiutang-tab");
    const today = new Date();
    const activePiutangs = this.state.piutangs.filter((p) => {
      const totalPaid = (p.payments || []).reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      return p.jumlah - totalPaid > 0.01;
    });
    const piutangCards = activePiutangs
      .sort(
        (a, b) => new Date(a.tanggalJatuhTempo) - new Date(b.tanggalJatuhTempo)
      )
      .map((p) => {
        const jatuhTempo = new Date(p.tanggalJatuhTempo + "T23:59:59");
        const diffTime = jatuhTempo - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let statusClass = "bg-green-600";
        let statusText = `Jatuh tempo dalam ${diffDays} hari`;
        if (diffDays < 0) {
          statusClass = "bg-red-600";
          statusText = `Terlambat ${Math.abs(diffDays)} hari`;
        } else if (diffDays <= 7) {
          statusClass = "bg-yellow-500";
        }
        const totalPaid = (p.payments || []).reduce(
          (sum, payment) => sum + payment.amount,
          0
        );
        const remainingAmount = p.jumlah - totalPaid;
        return `
                <div class="p-4 rounded-lg text-white shadow-md ${statusClass} group relative">
                    <div class="absolute top-2 right-2 flex gap-2">
                         <button onclick="app.showPaymentModal(${
                           p.id
                         })" class="text-white hover:text-blue-200 text-xs font-bold">BAYAR</button>
                         <button onclick="app.generateInvoicePDF(${
                           p.id
                         })" class="text-white hover:text-yellow-300 text-xs" title="Buat Invoice PDF"><i class="fas fa-file-invoice"></i></button>
                         <button onclick="app.deletePiutang(${
                           p.id
                         })" class="text-white hover:text-red-200 text-xs">Hapus</button>
                    </div>
                    <p class="font-bold text-lg">${p.namaPelanggan}</p>
                    <p class="text-sm">${p.keterangan}</p>
                    <p class="text-2xl font-bold my-1">${this.formatCurrency(
                      remainingAmount
                    )}</p>
                    <p class="text-xs opacity-80">Sisa dari ${this.formatCurrency(
                      p.jumlah
                    )}</p>
                    <p class="text-xs mt-2">Tgl Beli: ${
                      p.tanggalPembelian
                    } | Jatuh Tempo: ${p.tanggalJatuhTempo}</p>
                    <div class="absolute bottom-2 right-2 text-xs bg-black bg-opacity-20 px-2 py-1 rounded-full">${statusText}</div>
                </div>`;
      })
      .join("");
    container.innerHTML = `
                <section class="bg-white p-6 rounded-lg shadow-sm">
                    <h2 class="text-xl font-semibold mb-4">Manajemen Piutang</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="md:col-span-1">
                            <form id="add-piutang-form" class="bg-gray-50 p-4 rounded-lg border space-y-4">
                                <h3 class="font-semibold text-lg">Tambah Piutang Baru</h3>
                                <div><label for="piutang-nama" class="block text-sm font-medium text-gray-700">Nama Pelanggan</label><input type="text" id="piutang-nama" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                                <div><label for="piutang-jumlah" class="block text-sm font-medium text-gray-700">Jumlah (Rp)</label><input type="number" id="piutang-jumlah" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required min="0"></div>
                                <div><label for="piutang-keterangan" class="block text-sm font-medium text-gray-700">Keterangan</label><textarea id="piutang-keterangan" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></textarea></div>
                                <div><label for="piutang-tanggal-beli" class="block text-sm font-medium text-gray-700">Tanggal Pembelian</label><input type="date" id="piutang-tanggal-beli" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                                <div><label for="piutang-jatuh-tempo" class="block text-sm font-medium text-gray-700">Tanggal Jatuh Tempo</label><input type="date" id="piutang-jatuh-tempo" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                                <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>Tambah Data</button>
                            </form>
                        </div>
                        <div class="md:col-span-2">
                             <h3 class="font-semibold text-lg mb-4">Daftar Piutang Aktif</h3>
                             <div id="piutang-list" class="space-y-4 h-[60vh] overflow-y-auto pr-2">${
                               piutangCards ||
                               '<div class="text-center py-8 text-gray-500">Belum ada piutang aktif.</div>'
                             }</div>
                        </div>
                    </div>
                </section>`;
    document
      .getElementById("add-piutang-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.addPiutang();
      });
  },
  addPiutang() {
    const namaPelanggan = document.getElementById("piutang-nama").value.trim();
    const jumlah = parseFloat(document.getElementById("piutang-jumlah").value);
    const keterangan = document
      .getElementById("piutang-keterangan")
      .value.trim();
    const tanggalPembelian = document.getElementById(
      "piutang-tanggal-beli"
    ).value;
    const tanggalJatuhTempo = document.getElementById(
      "piutang-jatuh-tempo"
    ).value;
    if (
      !namaPelanggan ||
      !jumlah ||
      !keterangan ||
      !tanggalPembelian ||
      !tanggalJatuhTempo
    ) {
      this.showModal(
        "Peringatan",
        "Harap isi semua kolom piutang dengan benar."
      );
      return;
    }
    const piutangId = Date.now();
    const newPiutang = {
      id: piutangId,
      namaPelanggan,
      jumlah,
      keterangan,
      tanggalPembelian,
      tanggalJatuhTempo,
      noBuktiJurnal: `PIUT-${piutangId}`,
      payments: [],
    };
    this.state.piutangs.push(newPiutang);
    const newJurnals = [
      {
        id: Date.now() + Math.random(),
        tanggal: tanggalPembelian,
        noBukti: `PIUT-${piutangId}`,
        keterangan: `Piutang ${namaPelanggan}: ${keterangan}`,
        kelompok: "Umum",
        akun: "Piutang Usaha",
        debit: jumlah,
        kredit: 0,
      },
      {
        id: Date.now() + Math.random(),
        tanggal: tanggalPembelian,
        noBukti: `PIUT-${piutangId}`,
        keterangan: `Penjualan kepada ${namaPelanggan}`,
        kelompok: "Umum",
        akun: "Pendapatan Penjualan",
        debit: 0,
        kredit: jumlah,
      },
    ];
    this.state.jurnals.push(...newJurnals);
    this.saveData();
    this.renderDataPiutangTab();
    document.getElementById("add-piutang-form").reset();
    this.showModal(
      "Sukses",
      "Piutang baru berhasil ditambahkan dan jurnal telah dibuat."
    );
  },
  deletePiutang(id) {
    const piutang = this.state.piutangs.find((p) => p.id === id);
    if (!piutang) return;
    const totalPaid = (piutang.payments || []).reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    if (totalPaid > 0) {
      this.showModal(
        "Peringatan",
        "Piutang yang sudah memiliki pembayaran tidak dapat dihapus. Buat jurnal pembalik secara manual jika diperlukan."
      );
      return;
    }
    this.showModal(
      "Konfirmasi Hapus Piutang",
      `Apakah Anda yakin ingin menghapus piutang untuk <strong>${
        piutang.namaPelanggan
      }</strong> senilai <strong>${this.formatCurrency(
        piutang.jumlah
      )}</strong>? Ini juga akan membuat jurnal pembalik.`,
      [
        {
          text: "Ya, Hapus",
          class: "bg-red-600 hover:bg-red-700",
          callback: () => {
            this.state.piutangs = this.state.piutangs.filter(
              (p) => p.id !== id
            );
            const reversingJurnals = [
              {
                id: Date.now() + Math.random(),
                tanggal: new Date().toISOString().slice(0, 10),
                noBukti: `REV-${piutang.noBuktiJurnal}`,
                keterangan: `Pembatalan Piutang ${piutang.namaPelanggan}`,
                kelompok: "Umum",
                akun: "Pendapatan Penjualan",
                debit: piutang.jumlah,
                kredit: 0,
              },
              {
                id: Date.now() + Math.random(),
                tanggal: new Date().toISOString().slice(0, 10),
                noBukti: `REV-${piutang.noBuktiJurnal}`,
                keterangan: `Pembatalan Piutang ${piutang.namaPelanggan}`,
                kelompok: "Umum",
                akun: "Piutang Usaha",
                debit: 0,
                kredit: piutang.jumlah,
              },
            ];
            this.state.jurnals.push(...reversingJurnals);
            this.saveData();
            this.renderDataPiutangTab();
            this.closeModal();
          },
        },
        {
          text: "Batal",
          class: "bg-gray-600 hover:bg-gray-700",
          callback: () => this.closeModal(),
        },
      ]
    );
  },
  showPaymentModal(piutangId) {
    const piutang = this.state.piutangs.find((p) => p.id === piutangId);
    if (!piutang) return;
    const totalPaid = (piutang.payments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const remainingAmount = piutang.jumlah - totalPaid;
    const body = `
                <p class="mb-2">Mencatat pembayaran untuk <strong>${
                  piutang.namaPelanggan
                }</strong></p>
                <p class="text-sm text-gray-600 mb-4">Sisa piutang: <strong>${this.formatCurrency(
                  remainingAmount
                )}</strong></p>
                <form id="payment-form" class="space-y-4">
                     <div><label for="payment-amount" class="block text-sm font-medium text-gray-700">Nominal Pembayaran (Rp)</label><input type="number" id="payment-amount" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required min="0" max="${remainingAmount}" value="${remainingAmount}"></div>
                     <div><label for="payment-date" class="block text-sm font-medium text-gray-700">Tanggal Pembayaran</label><input type="date" id="payment-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required value="${new Date()
                       .toISOString()
                       .slice(0, 10)}"></div>
                     <div><label for="payment-desc" class="block text-sm font-medium text-gray-700">Deskripsi</label><input type="text" id="payment-desc" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Contoh: Pembayaran via transfer Bank" required></div>
                </form>`;
    this.showModal("Input Pembayaran Piutang", body, [
      {
        text: "Simpan Pembayaran",
        class: "bg-blue-600 hover:bg-blue-700",
        callback: () => this.addPayment(piutangId),
      },
      {
        text: "Batal",
        class: "bg-gray-600 hover:bg-gray-700",
        callback: () => this.closeModal(),
      },
    ]);
  },
  addPayment(piutangId) {
    const amount = parseFloat(document.getElementById("payment-amount").value);
    const date = document.getElementById("payment-date").value;
    const description = document.getElementById("payment-desc").value.trim();
    const piutang = this.state.piutangs.find((p) => p.id === piutangId);
    const totalPaid = (piutang.payments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const remainingAmount = piutang.jumlah - totalPaid;
    if (
      !amount ||
      !date ||
      !description ||
      amount <= 0 ||
      amount > remainingAmount + 0.01
    ) {
      this.showModal(
        "Peringatan",
        "Data pembayaran tidak valid. Pastikan nominal tidak melebihi sisa piutang."
      );
      return;
    }
    piutang.payments.push({ amount, date, description });
    const paymentJurnals = [
      {
        id: Date.now() + Math.random(),
        tanggal: date,
        noBukti: `PEL-${piutang.id}-${Date.now()}`,
        keterangan: `Pelunasan piutang dari ${piutang.namaPelanggan}`,
        kelompok: "Umum",
        akun: "Kas",
        debit: amount,
        kredit: 0,
      },
      {
        id: Date.now() + Math.random(),
        tanggal: date,
        noBukti: `PEL-${piutang.id}-${Date.now()}`,
        keterangan: description,
        kelompok: "Umum",
        akun: "Piutang Usaha",
        debit: 0,
        kredit: amount,
      },
    ];
    this.state.jurnals.push(...paymentJurnals);
    this.saveData();
    this.renderDataPiutangTab();
    this.closeModal();
    this.showModal(
      "Sukses",
      `Pembayaran sebesar ${this.formatCurrency(amount)} berhasil dicatat.`
    );
  },
  renderStockBarangTab() {
    const container = document.getElementById("stockBarang-tab");
    const stockLevels = this.calculateStockLevels();
    const itemOptions = this.getStockItemOptions();
    const defaultDate = new Date(this.state.currentMonth + "-02")
      .toISOString()
      .split("T")[0];

    let jurnalStokRows = Object.entries(stockLevels)
      .map(([kode, data]) => {
        return `
                <tr class="hover:bg-gray-50">
                    <td class="p-2 border-b text-sm">${kode}</td>
                    <td class="p-2 border-b text-sm">${data.nama}</td>
                    <td class="p-2 border-b text-sm text-right">${data.stokAwal}</td>
                    <td class="p-2 border-b text-sm text-right text-green-600">${data.masuk}</td>
                    <td class="p-2 border-b text-sm text-right text-red-600">${data.keluar}</td>
                    <td class="p-2 border-b text-sm text-right font-bold">${data.stokAkhir}</td>
                    <td class="p-2 border-b text-center">
                        <button onclick="app.deleteStockItem('${kode}')" class="text-gray-400 hover:text-red-600 px-2" title="Hapus Item"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
              `;
      })
      .join("");

    if (Object.keys(stockLevels).length === 0) {
      jurnalStokRows = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Belum ada barang yang didaftarkan.</td></tr>`;
    }

    container.innerHTML = `
            <section class="bg-white p-6 rounded-lg shadow-sm">
                <h2 class="text-xl font-semibold mb-4">Manajemen Stok Barang</h2>
                
                <!-- Navigasi Sub-Tab -->
                <div class="mb-4 border-b border-gray-200">
                    <nav class="flex -mb-px" aria-label="Tabs">
                        <button onclick="app.changeStockSubTab('jurnalStok', this)" class="stock-subtab-button active-subtab" data-tab="jurnalStok">
                            <i class="fas fa-book-open mr-2"></i>Jurnal Stok
                        </button>
                        <button onclick="app.changeStockSubTab('barangMasuk', this)" class="stock-subtab-button" data-tab="barangMasuk">
                            <i class="fas fa-arrow-down mr-2"></i>Data Barang Masuk
                        </button>
                        <button onclick="app.changeStockSubTab('barangKeluar', this)" class="stock-subtab-button" data-tab="barangKeluar">
                            <i class="fas fa-arrow-up mr-2"></i>Data Barang Keluar
                        </button>
                    </nav>
                </div>

                <!-- Konten Sub-Tab -->
                <div id="jurnalStok-subtab" class="stock-subtab-content">
                    <h3 class="text-lg font-semibold mb-3">Tambah Barang Baru</h3>
                    <form id="add-new-stock-item-form" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                        <div>
                            <label for="new-item-kode" class="block text-sm font-medium text-gray-700">Kode Barang</label>
                            <input type="text" id="new-item-kode" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        </div>
                        <div>
                            <label for="new-item-nama" class="block text-sm font-medium text-gray-700">Nama Barang</label>
                            <input type="text" id="new-item-nama" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        </div>
                        <div>
                            <label for="new-item-stok-awal" class="block text-sm font-medium text-gray-700">Stok Awal Periode</label>
                            <input type="number" id="new-item-stok-awal" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" min="0" value="0" required>
                        </div>
                        <div class="self-end">
                            <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"><i class="fas fa-plus mr-2"></i>Tambah Barang</button>
                        </div>
                    </form>

                    <h3 class="text-lg font-semibold mb-3">Jurnal Stok Periode: ${this.formatMonth(
                      this.state.currentMonth
                    )}</h3>
                    <div class="overflow-x-auto border rounded-md">
                        <table id="jurnal-stok-table" class="min-w-full">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                                    <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Stok Awal</th>
                                    <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Masuk</th>
                                    <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Keluar</th>
                                    <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Stok Akhir</th>
                                    <th class="p-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>${jurnalStokRows}</tbody>
                        </table>
                    </div>
                </div>

                <div id="barangMasuk-subtab" class="stock-subtab-content hidden">
                  <h3 class="text-lg font-semibold mb-3">Input Data Barang Masuk</h3>
                    <form id="add-stock-masuk-form" class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border items-end">
                        <div>
                            <label for="stock-tanggal-masuk" class="block text-sm font-medium text-gray-700">Tanggal</label>
                            <input type="date" id="stock-tanggal-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${defaultDate}" required>
                        </div>
                        <div>
                            <label for="stock-kode-masuk" class="block text-sm font-medium text-gray-700">Kode Barang</label>
                            <select id="stock-kode-masuk" class="stock-kode-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" data-formtype="masuk" required>
                                <option value="">-- Pilih --</option>
                                ${itemOptions}
                            </select>
                        </div>
                        <div>
                            <label for="stock-nama-masuk" class="block text-sm font-medium text-gray-700">Nama Barang</label>
                            <input type="text" id="stock-nama-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100" readonly>
                        </div>
                        <div>
                            <label for="stock-jumlah-masuk" class="block text-sm font-medium text-gray-700">Jumlah</label>
                            <input type="number" id="stock-jumlah-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" min="1" required>
                        </div>
                         <div>
                            <label for="stock-keterangan-masuk" class="block text-sm font-medium text-gray-700">Keterangan</label>
                            <input type="text" id="stock-keterangan-masuk" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ket...">
                        </div>
                        <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700" title="Simpan"><i class="fas fa-save"></i></button>
                    </form>
                    
                    <!-- Tabel Riwayat Barang Masuk -->
                    <h4 class="text-lg font-semibold mt-8 mb-3">Riwayat Barang Masuk Periode Ini</h4>
                    <div class="overflow-x-auto border rounded-md">
                        <table class="min-w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                                    <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                                    <th class="p-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="stock-masuk-history-body">
                                <!-- Riwayat akan di-render di sini -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="barangKeluar-subtab" class="stock-subtab-content hidden">
                   <h3 class="text-lg font-semibold mb-3">Input Data Barang Keluar</h3>
                    <form id="add-stock-keluar-form" class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border items-end">
                         <div>
                            <label for="stock-tanggal-keluar" class="block text-sm font-medium text-gray-700">Tanggal</label>
                            <input type="date" id="stock-tanggal-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${defaultDate}" required>
                        </div>
                        <div>
                            <label for="stock-kode-keluar" class="block text-sm font-medium text-gray-700">Kode Barang</label>
                            <select id="stock-kode-keluar" class="stock-kode-input mt-1 block w-full rounded-md border-gray-300 shadow-sm" data-formtype="keluar" required>
                                <option value="">-- Pilih --</option>
                                ${itemOptions}
                            </select>
                        </div>
                        <div>
                            <label for="stock-nama-keluar" class="block text-sm font-medium text-gray-700">Nama Barang</label>
                            <input type="text" id="stock-nama-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100" readonly>
                        </div>
                        <div>
                            <label for="stock-jumlah-keluar" class="block text-sm font-medium text-gray-700">Jumlah</label>
                            <input type="number" id="stock-jumlah-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" min="1" required>
                        </div>
                         <div>
                            <label for="stock-keterangan-keluar" class="block text-sm font-medium text-gray-700">Keterangan</label>
                            <input type="text" id="stock-keterangan-keluar" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ket...">
                        </div>
                        <button type="submit" class="w-full py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700" title="Simpan"><i class="fas fa-save"></i></button>
                    </form>
                    
                    <!-- Tabel Riwayat Barang Keluar -->
                    <h4 class="text-lg font-semibold mt-8 mb-3">Riwayat Barang Keluar Periode Ini</h4>
                    <div class="overflow-x-auto border rounded-md">
                        <table class="min-w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Barang</th>
                                    <th class="p-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                                    <th class="p-2 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                                    <th class="p-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="stock-keluar-history-body">
                                <!-- Riwayat akan di-render di sini -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
          `;

    // --- Render Tabel Riwayat ---
    const allTransactions = this.state.stock.transactions;
    const getItemName = (kode) =>
      this.state.stock.items.find((i) => i.kode === kode)?.nama || "N/A";

    const masukTableRows = allTransactions
      .filter((t) => t.tipe === "masuk")
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
      .map(
        (tx) => `
                  <tr class="hover:bg-gray-50">
                      <td class="p-2 border-b text-sm">${tx.tanggal}</td>
                      <td class="p-2 border-b text-sm">${tx.kode}</td>
                      <td class="p-2 border-b text-sm">${getItemName(
                        tx.kode
                      )}</td>
                      <td class="p-2 border-b text-sm text-right">${
                        tx.jumlah
                      }</td>
                      <td class="p-2 border-b text-sm">${
                        tx.keterangan || ""
                      }</td>
                      <td class="p-2 border-b text-center">
                          <button onclick="app.deleteStockTransaction(${
                            tx.id
                          }, 'barangMasuk')" class="text-gray-400 hover:text-red-600 px-2" title="Hapus Transaksi">
                              <i class="fas fa-trash"></i>
                          </button>
                      </td>
                  </tr>
              `
      )
      .join("");

    const keluarTableRows = allTransactions
      .filter((t) => t.tipe === "keluar")
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
      .map(
        (tx) => `
                  <tr class="hover:bg-gray-50">
                      <td class="p-2 border-b text-sm">${tx.tanggal}</td>
                      <td class="p-2 border-b text-sm">${tx.kode}</td>
                      <td class="p-2 border-b text-sm">${getItemName(
                        tx.kode
                      )}</td>
                      <td class="p-2 border-b text-sm text-right">${
                        tx.jumlah
                      }</td>
                      <td class="p-2 border-b text-sm">${
                        tx.keterangan || ""
                      }</td>
                      <td class="p-2 border-b text-center">
                          <button onclick="app.deleteStockTransaction(${
                            tx.id
                          }, 'barangKeluar')" class="text-gray-400 hover:text-red-600 px-2" title="Hapus Transaksi">
                              <i class="fas fa-trash"></i>
                          </button>
                      </td>
                  </tr>
              `
      )
      .join("");

    document.getElementById("stock-masuk-history-body").innerHTML =
      masukTableRows ||
      `<tr><td colspan="6" class="text-center py-4 text-gray-500">Belum ada riwayat.</td></tr>`;
    document.getElementById("stock-keluar-history-body").innerHTML =
      keluarTableRows ||
      `<tr><td colspan="6" class="text-center py-4 text-gray-500">Belum ada riwayat.</td></tr>`;

    // Tambahkan Event Listeners
    document
      .getElementById("add-new-stock-item-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.addNewStockItem();
      });

    document
      .getElementById("add-stock-masuk-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.addStockMasuk();
      });

    document
      .getElementById("add-stock-keluar-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.addStockKeluar();
      });

    document.querySelectorAll(".stock-kode-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        this.autoFillNamaBarang(e.target.dataset.formtype);
      });
    });
  },

  changeStockSubTab(tabName, element) {
    document.querySelectorAll(".stock-subtab-content").forEach((tab) => {
      tab.classList.add("hidden");
    });
    document.getElementById(`${tabName}-subtab`).classList.remove("hidden");

    document.querySelectorAll(".stock-subtab-button").forEach((button) => {
      button.classList.remove("active-subtab");
    });
    element.classList.add("active-subtab");
  },

  calculateStockLevels(
    items = this.state.stock.items,
    transactions = this.state.stock.transactions
  ) {
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
        if (trx.tipe === "masuk") {
          stockData[trx.kode].masuk += trx.jumlah;
        } else if (trx.tipe === "keluar") {
          stockData[trx.kode].keluar += trx.jumlah;
        }
      }
    });

    Object.keys(stockData).forEach((kode) => {
      const item = stockData[kode];
      item.stokAkhir = item.stokAwal + item.masuk - item.keluar;
    });

    return stockData;
  },

  getStockItemOptions() {
    return this.state.stock.items
      .sort((a, b) => a.kode.localeCompare(b.kode))
      .map(
        (item) =>
          `<option value="${item.kode}">${item.kode} - ${item.nama}</option>`
      )
      .join("");
  },

  autoFillNamaBarang(formType) {
    try {
      const kode = document.getElementById(`stock-kode-${formType}`).value;
      const item = this.state.stock.items.find((i) => i.kode === kode);
      const namaInput = document.getElementById(`stock-nama-${formType}`);
      if (item) {
        namaInput.value = item.nama;
      } else {
        namaInput.value = "";
      }
    } catch (e) {
      console.error("Error autoFillNamaBarang:", e);
    }
  },

  addNewStockItem() {
    const kode = document
      .getElementById("new-item-kode")
      .value.trim()
      .toUpperCase();
    const nama = document.getElementById("new-item-nama").value.trim();
    const stokAwal =
      parseFloat(document.getElementById("new-item-stok-awal").value) || 0;

    if (!kode || !nama) {
      this.showModal("Peringatan", "Kode dan Nama Barang harus diisi.");
      return;
    }

    if (this.state.stock.items.some((item) => item.kode === kode)) {
      this.showModal("Peringatan", "Kode Barang sudah ada. Gunakan kode unik.");
      return;
    }

    this.state.stock.items.push({
      id: Date.now(),
      kode,
      nama,
      stokAwal,
    });
    this.saveData();
    this.renderStockBarangTab(); // Render ulang untuk update tabel dan dropdown
    this.showModal("Sukses", `Barang '${nama}' berhasil ditambahkan.`);
  },

  deleteStockItem(kode) {
    const hasTransactions = this.state.stock.transactions.some(
      (trx) => trx.kode === kode
    );
    let message = `Yakin ingin menghapus barang dengan kode '${kode}'? Tindakan ini tidak dapat dibatalkan.`;

    if (hasTransactions) {
      message = `Barang dengan kode '${kode}' memiliki riwayat transaksi. Menghapus barang ini akan **menghapus SEMUA riwayat transaksi (masuk/keluar) yang terkait**. Yakin ingin melanjutkan?`;
    }

    this.showModal("Konfirmasi Hapus", message, [
      {
        text: "Ya, Hapus",
        class: "bg-red-600 hover:bg-red-700",
        callback: () => {
          // 1. Hapus item dari daftar 'items'
          this.state.stock.items = this.state.stock.items.filter(
            (item) => item.kode !== kode
          );

          // 2. Hapus semua transaksi terkait
          if (hasTransactions) {
            this.state.stock.transactions =
              this.state.stock.transactions.filter((trx) => trx.kode !== kode);
          }

          // 3. Simpan, render ulang, tutup modal
          this.saveData();
          this.renderStockBarangTab();
          this.closeModal();
        },
      },
      {
        text: "Batal",
        class: "bg-gray-600 hover:bg-gray-700",
        callback: () => this.closeModal(),
      },
    ]);
  },

  addStockMasuk() {
    const tanggal = document.getElementById("stock-tanggal-masuk").value;
    const kode = document.getElementById("stock-kode-masuk").value;
    const jumlah = parseFloat(
      document.getElementById("stock-jumlah-masuk").value
    );
    const keterangan = document
      .getElementById("stock-keterangan-masuk")
      .value.trim();

    if (!tanggal || !kode || !jumlah || jumlah <= 0) {
      this.showModal(
        "Peringatan",
        "Harap isi Tanggal, Kode Barang, dan Jumlah (lebih dari 0) dengan benar."
      );
      return;
    }

    if (tanggal.slice(0, 7) !== this.state.currentMonth) {
      this.showModal(
        "Peringatan",
        `Tanggal transaksi harus berada dalam periode aktif saat ini (${this.formatMonth(
          this.state.currentMonth
        )}).`
      );
      return;
    }

    this.state.stock.transactions.push({
      id: Date.now(),
      tanggal,
      kode,
      tipe: "masuk",
      jumlah,
      keterangan,
    });

    this.saveData();
    document.getElementById("add-stock-masuk-form").reset(); // Reset form
    this.renderStockBarangTab(); // Render ulang tab
    // Pindahkan pengguna kembali ke tab "Barang Masuk" setelah menyimpan
    this.changeStockSubTab(
      "barangMasuk",
      document.querySelector('.stock-subtab-button[data-tab="barangMasuk"]')
    );
    this.showModal("Sukses", "Data barang masuk berhasil disimpan.");
  },

  addStockKeluar() {
    const tanggal = document.getElementById("stock-tanggal-keluar").value;
    const kode = document.getElementById("stock-kode-keluar").value;
    const jumlah = parseFloat(
      document.getElementById("stock-jumlah-keluar").value
    );
    const keterangan = document
      .getElementById("stock-keterangan-keluar")
      .value.trim();

    if (!tanggal || !kode || !jumlah || jumlah <= 0) {
      this.showModal(
        "Peringatan",
        "Harap isi Tanggal, Kode Barang, dan Jumlah (lebih dari 0) dengan benar."
      );
      return;
    }

    if (tanggal.slice(0, 7) !== this.state.currentMonth) {
      this.showModal(
        "Peringatan",
        `Tanggal transaksi harus berada dalam periode aktif saat ini (${this.formatMonth(
          this.state.currentMonth
        )}).`
      );
      return;
    }

    // Validasi Stok
    const stockLevels = this.calculateStockLevels();
    const itemStok = stockLevels[kode];
    if (!itemStok || itemStok.stokAkhir < jumlah) {
      this.showModal(
        "Peringatan",
        `Stok tidak mencukupi. Stok akhir untuk '${kode}' hanya ${
          itemStok ? itemStok.stokAkhir : 0
        }.`
      );
      return;
    }

    this.state.stock.transactions.push({
      id: Date.now(),
      tanggal,
      kode,
      tipe: "keluar",
      jumlah,
      keterangan,
    });

    this.saveData();
    document.getElementById("add-stock-keluar-form").reset(); // Reset form
    this.renderStockBarangTab(); // Render ulang tab
    // Pindahkan pengguna kembali ke tab "Barang Keluar" setelah menyimpan
    this.changeStockSubTab(
      "barangKeluar",
      document.querySelector('.stock-subtab-button[data-tab="barangKeluar"]')
    );
    this.showModal("Sukses", "Data barang keluar berhasil disimpan.");
  },

  deleteStockTransaction(id, subTabToReopen = "jurnalStok") {
    const tx = this.state.stock.transactions.find((t) => t.id === id);
    if (!tx) return;

    // Validasi khusus jika menghapus transaksi 'masuk'
    if (tx.tipe === "masuk") {
      // Periksa apakah penghapusan ini akan menyebabkan stok negatif
      const kode = tx.kode;
      const jumlahDihapus = tx.jumlah;

      // Buat salinan transaksi tanpa yang akan dihapus
      const newTransactions = this.state.stock.transactions.filter(
        (t) => t.id !== id
      );
      // Hitung ulang level stok dengan data baru
      const newStockLevels = this.calculateStockLevels(
        this.state.stock.items,
        newTransactions
      );

      if (newStockLevels[kode] && newStockLevels[kode].stokAkhir < 0) {
        this.showModal(
          "Peringatan",
          `Tidak dapat menghapus transaksi 'masuk' ini karena akan menyebabkan stok akhir untuk '${kode}' menjadi negatif (${newStockLevels[kode].stokAkhir}).`
        );
        return;
      }
    }

    this.showModal(
      "Konfirmasi Hapus",
      `Yakin ingin menghapus transaksi ini? (Tgl: ${tx.tanggal}, Kode: ${tx.kode}, Jml: ${tx.jumlah})`,
      [
        {
          text: "Ya, Hapus",
          class: "bg-red-600 hover:bg-red-700",
          callback: () => {
            this.state.stock.transactions =
              this.state.stock.transactions.filter((t) => t.id !== id);
            this.saveData();
            this.renderStockBarangTab();
            // Buka kembali sub-tab tempat pengguna menghapus
            this.changeStockSubTab(
              subTabToReopen,
              document.querySelector(
                `.stock-subtab-button[data-tab="${subTabToReopen}"]`
              )
            );
            this.closeModal();
          },
        },
        {
          text: "Batal",
          class: "bg-gray-600 hover:bg-gray-700",
          callback: () => this.closeModal(),
        },
      ]
    );
  },

  // Hapus fungsi lama addStockItem dan deleteStockItem
  // addStockItem() { ... } -> Dihapus
  // deleteStockItem(brand, id) { ... } -> Dihapus

  // NEW TABS END HERE

  exportData() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("accountingApp_")) {
        allData[key] = localStorage.getItem(key);
      }
    }
    if (Object.keys(allData).length === 0) {
      this.showModal("Info", "Tidak ada data untuk diekspor.");
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
    this.showModal("Sukses", "Semua data telah berhasil diekspor.");
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
          this.showModal(
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
                  this.closeModal();
                  window.location.reload();
                },
              },
              {
                text: "Batal",
                class: "bg-gray-600 hover:bg-gray-700",
                callback: () => this.closeModal(),
              },
            ]
          );
        } catch (error) {
          this.showModal(
            "Error",
            "Gagal membaca file. Pastikan file dalam format JSON yang benar."
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },
  async callGeminiAPI(prompt, buttonElement) {
     // CEK APAKAH API KEY SUDAH ADA
          if (!this.state.apiKey) {
              this.showModal(
                  "API Key Diperlukan",
                  `<p class="mb-4">Fitur analisis cerdas ini membutuhkan Google Gemini API Key.</p>
                   <p class="mb-4 text-sm text-gray-600">Silakan buka tab <b>Pengaturan</b> dan masukkan API Key Anda di kolom yang tersedia.</p>
                   <button onclick="app.changeTab('pengaturan'); app.closeModal();" class="bg-blue-600 text-white px-4 py-2 rounded text-sm">Ke Pengaturan</button>`
              );
              return;
          }

    if (buttonElement) buttonElement.classList.add("loading");
    this.showModal(
      "✨ Analisis AI",
      `<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Menghubungi Gemini...</p></div>`
    );
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };
    // GUNAKAN API KEY DARI STATE (YANG DIAMBIL DARI LOCAL STORAGE)
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${this.state.apiKey}`;
          
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        let text = result.candidates[0].content.parts[0].text;
        text = text.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );
        text = text.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>');
        text = text.replace(/(\r\n|\n|\r)/gm, "<br>");
        text = text.replace(/<br><li/g, "<li");
        this.showModal(
          "✨ Analisis AI",
          `<div class="gemini-response-content text-left space-y-2">${text}</div>`
        );
      } else {
        this.showModal(
          "Error",
          "Gagal mendapatkan respons dari AI. Struktur data tidak terduga."
        );
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      this.showModal(
        "Error",
        "Gagal menghubungi AI. Silakan periksa koneksi internet Anda dan coba lagi."
      );
    } finally {
      if (buttonElement) buttonElement.classList.remove("loading");
    }
  },
  analyzeTransaction(event, noBukti) {
    const button = event.currentTarget;
    const entries = this.state.jurnals.filter((j) => j.noBukti === noBukti);
    if (entries.length === 0) return;
    let transactionDetails = entries
      .map(
        (e) =>
          `${e.akun}: ${
            e.debit > 0
              ? "Debit " + this.formatCurrency(e.debit)
              : "Kredit " + this.formatCurrency(e.kredit)
          }`
      )
      .join("\n");
    const prompt = `Anda adalah seorang akuntan ahli yang ramah. Analisis entri jurnal umum berikut untuk sebuah bisnis kecil di Indonesia. Jelaskan dalam bahasa Indonesia yang sederhana apa arti transaksi ini dari sudut pandang bisnis. Berikan penjelasan dalam format poin-poin ringkas. Transaksi:\n${transactionDetails}`;
    this.callGeminiAPI(prompt, button);
  },
  analyzeLabaRugi(event) {
    const button = event.currentTarget;
    const { totalPendapatan, totalBeban, labaBersih, bebanDetails } =
      this.calculateFinancials();
    const bebanTerbesar = Object.entries(bebanDetails)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key, val]) => `${key}: ${this.formatCurrency(val)}`)
      .join(", ");
    const prompt = `Anda adalah seorang analis keuangan yang ramah. Berikan ringkasan singkat dan analisis mengenai laporan laba rugi berikut untuk sebuah bisnis kecil di Indonesia. Fokus pada poin-poin penting dalam format poin-poin yang mudah dibaca. Data Laporan: Total Pendapatan: ${this.formatCurrency(
      totalPendapatan
    )}, Total Beban: ${this.formatCurrency(
      totalBeban
    )}, Laba/Rugi Bersih: ${this.formatCurrency(
      labaBersih
    )}. Komposisi beban terbesar adalah ${bebanTerbesar || "tidak ada"}.`;
    this.callGeminiAPI(prompt, button);
  },
  analyzeNeraca(event) {
    const button = event.currentTarget;
    const getAkunSaldo = (tipe, saldoNormal) => {
      return this.state.settings.akuns
        .filter((a) => a.type === tipe)
        .map((akun) => {
          const saldo = this.state.jurnals
            .filter((j) => j.akun === akun.name)
            .reduce(
              (sum, j) =>
                sum +
                (saldoNormal === "debit"
                  ? j.debit - j.kredit
                  : j.kredit - j.debit),
              0
            );
          return { name: akun.name, saldo };
        })
        .filter((a) => a.saldo !== 0);
    };
    const aset = getAkunSaldo("Aset", "debit");
    const liabilitas = getAkunSaldo("Liabilitas", "kredit");
    const totalAset = aset.reduce((sum, a) => sum + a.saldo, 0);
    const totalLiabilitas = liabilitas.reduce((sum, a) => sum + a.saldo, 0);
    const totalEkuitas = totalAset - totalLiabilitas;
    if (totalAset === 0) {
      this.showModal("Info", "Tidak ada data neraca untuk dianalisis.");
      return;
    }
    const asetDetails = aset
      .map((a) => `${a.name}: ${this.formatCurrency(a.saldo)}`)
      .join(", ");
    const liabilitasDetails = liabilitas
      .map((l) => `${l.name}: ${this.formatCurrency(l.saldo)}`)
      .join(", ");
    const prompt = `Anda adalah seorang analis keuangan ahli. Berdasarkan data neraca berikut untuk sebuah bisnis kecil di Indonesia, berikan analisis singkat mengenai kesehatan keuangannya. Fokus pada rasio lancar (jika bisa diestimasi dari nama akun), rasio utang terhadap ekuitas, dan berikan saran praktis dalam format poin-poin. Data Neraca: - Total Aset: ${this.formatCurrency(
      totalAset
    )} (Rincian: ${
      asetDetails || "Tidak ada"
    }) - Total Liabilitas: ${this.formatCurrency(totalLiabilitas)} (Rincian: ${
      liabilitasDetails || "Tidak ada"
    }) - Total Ekuitas (dihitung): ${this.formatCurrency(
      totalEkuitas
    )}. Berikan jawaban dalam Bahasa Indonesia yang mudah dipahami.`;
    this.callGeminiAPI(prompt, button);
  },
  async generatePDF() {
    this.showModal(
      "Info",
      '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Mempersiapkan PDF canggih Anda...</p></div>'
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { jurnals } = this.state;
    const {
      pendapatanDetails,
      bebanDetails,
      totalPendapatan,
      totalBeban,
      labaBersih,
    } = this.calculateFinancials();
    const monthlyData = jurnals.reduce((acc, j) => {
      const month = j.tanggal.substring(0, 7);
      if (!acc[month]) {
        acc[month] = { pendapatan: 0, beban: 0 };
      }
      if (
        this.state.settings.akuns.find(
          (a) => a.name === j.akun && a.type === "Pendapatan"
        )
      ) {
        acc[month].pendapatan += j.kredit - j.debit;
      }
      if (
        this.state.settings.akuns.find(
          (a) => a.name === j.akun && a.type === "Beban"
        )
      ) {
        acc[month].beban += j.debit - j.kredit;
      }
      return acc;
    }, {});
    const sortedMonths = Object.keys(monthlyData).sort();
    const chartLabels = sortedMonths.map((m) =>
      new Date(m + "-02").toLocaleString("id-ID", {
        month: "short",
        year: "2-digit",
      })
    );
    const chartData = sortedMonths.map(
      (m) => monthlyData[m].pendapatan - monthlyData[m].beban
    );
    let lineChartImage = null;
    if (chartData.length > 0) {
      const ctx = document.getElementById("pdf-chart").getContext("2d");
      const pdfChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "Laba (Rugi) Bersih",
              data: chartData,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              fill: true,
              tension: 0.1,
            },
          ],
        },
        options: {
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              ticks: { callback: (value) => this.formatCurrency(value) },
            },
          },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      lineChartImage = pdfChart.toBase64Image();
      pdfChart.destroy();
    }
    let pieChartImage = null;
    const filteredBeban = Object.entries(bebanDetails).filter(
      ([, val]) => val > 0
    );
    const pieChartColors = [
      "#3b82f6",
      "#ef4444",
      "#f97316",
      "#84cc16",
      "#14b8a6",
      "#a855f7",
      "#ec4899",
    ];
    if (filteredBeban.length > 0) {
      const pieCtx = document.getElementById("pdf-pie-chart").getContext("2d");
      const pdfPieChart = new Chart(pieCtx, {
        type: "pie",
        data: {
          labels: filteredBeban.map(([key]) => key),
          datasets: [
            {
              data: filteredBeban.map(([, val]) => val),
              backgroundColor: pieChartColors,
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      pieChartImage = pdfPieChart.toBase64Image();
      pdfPieChart.destroy();
    }
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Laporan Keuangan Komprehensif", 105, 22, {
      align: "center",
    });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${this.formatMonth(this.state.currentMonth)}`, 105, 30, {
      align: "center",
    });
    let lastY = 40;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan Laba Rugi", 14, lastY);
    const labaRugiBody = [
      ["Total Pendapatan", this.formatCurrency(totalPendapatan)],
      ["Total Beban", this.formatCurrency(totalBeban)],
      [
        { content: "Laba (Rugi) Bersih", styles: { fontStyle: "bold" } },
        {
          content: this.formatCurrency(labaBersih),
          styles: { fontStyle: "bold" },
        },
      ],
    ];
    doc.autoTable({
      startY: lastY + 5,
      body: labaRugiBody,
      theme: "plain",
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: "right" } },
    });
    lastY = doc.autoTable.previous.finalY + 15;
    if (lineChartImage) {
      if (lastY + 105 > 280) {
        doc.addPage();
        lastY = 22;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Diagram Tren Laba (Rugi) Bersih Bulanan", 14, lastY);
      doc.addImage(lineChartImage, "PNG", 14, lastY + 5, 180, 90);
      lastY += 105;
    }
    if (pieChartImage) {
      if (lastY + 115 > 280) {
        doc.addPage();
        lastY = 22;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Visualisasi Komposisi Beban", 14, lastY);
      lastY += 5;
      doc.addImage(pieChartImage, "PNG", 14, lastY, 100, 100);
      let legendY = lastY + 105;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      filteredBeban.forEach(([key], index) => {
        if (legendY > 280) {
          doc.addPage();
          legendY = 22;
        }
        const color = pieChartColors[index % pieChartColors.length];
        doc.setFillColor(color);
        doc.rect(14, legendY, 3, 3, "F");
        doc.text(`${key}`, 20, legendY + 2.5);
        legendY += 6;
      });
      lastY = legendY + 5;
      if (lastY > 250) {
        doc.addPage();
        lastY = 22;
      }
      const bebanBody = filteredBeban.map(([key, value]) => [
        key,
        this.formatCurrency(value),
      ]);
      bebanBody.push([
        { content: "Total Beban", styles: { fontStyle: "bold" } },
        {
          content: this.formatCurrency(totalBeban),
          styles: { fontStyle: "bold" },
        },
      ]);
      doc.autoTable({
        startY: lastY,
        head: [["Rincian Kategori Beban", "Jumlah"]],
        body: bebanBody,
        theme: "striped",
        headStyles: { fillColor: "#374151" },
      });
      lastY = doc.autoTable.previous.finalY + 15;
    }
    doc.addPage();
    let journalY = 22;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Rincian Jurnal Umum", 14, journalY);
    const journalBody = [];
    const groupedJurnals = jurnals.reduce((acc, j) => {
      (acc[j.noBukti] = acc[j.noBukti] || []).push(j);
      return acc;
    }, {});
    Object.values(groupedJurnals)
      .sort((a, b) => new Date(b[0].tanggal) - new Date(a[0].tanggal))
      .forEach((entries) => {
        const firstEntry = entries[0];
        journalBody.push([
          {
            content: `Tanggal: ${firstEntry.tanggal} | No: ${
              firstEntry.noBukti
            } | Kelompok: ${firstEntry.kelompok || "Lainnya"}`,
            colSpan: 3,
            styles: {
              fontStyle: "bold",
              fillColor: "#e8f0fe",
              textColor: "#1e3a8a",
            },
          },
        ]);
        entries.forEach((entry) => {
          if (entry.debit > 0 || entry.kredit > 0) {
            let akunCell =
              entry.kredit > 0
                ? `    ${entry.akun}\n    (${entry.keterangan})`
                : `${entry.akun}\n(${entry.keterangan})`;
            journalBody.push([
              akunCell,
              entry.debit ? this.formatCurrency(entry.debit) : "",
              entry.kredit ? this.formatCurrency(entry.kredit) : "",
            ]);
          }
        });
      });
    doc.autoTable({
      startY: journalY + 5,
      head: [["Akun & Keterangan", "Debit", "Kredit"]],
      body: journalBody,
      theme: "grid",
      headStyles: {
        fillColor: "#1e40af",
        textColor: "#ffffff",
        fontStyle: "bold",
      },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      didDrawCell: (data) => {
        if (data.cell && data.cell.raw && data.cell.raw.colSpan === 3) {
          doc.setFontSize(9);
          doc.setTextColor(100);
        }
      },
    });
    doc.save(`Laporan_Keuangan_${this.state.currentMonth}.pdf`);
    this.closeModal();
  },

  async generateInvoicePDF(piutangId) {
    const piutang = this.state.piutangs.find((p) => p.id === piutangId);
    if (!piutang) {
      this.showModal("Error", "Data piutang tidak ditemukan.");
      return;
    }

    this.showModal(
      "Info",
      '<div class="text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i><p class="mt-2">Membuat Invoice PDF...</p></div>'
    );
    await new Promise((resolve) => setTimeout(resolve, 50)); // Izinkan modal untuk render

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const totalPaid = (piutang.payments || []).reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const remainingAmount = piutang.jumlah - totalPaid;

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 105, 20, { align: "center" });

    // Info Perusahaan (Kiri)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DARI:", 14, 40);
    doc.setFont("helvetica", "normal");
    doc.text("Perusahaan Anda", 14, 46);
    doc.text("Jalan Contoh No. 123", 14, 51);
    doc.text("Kota, 12345", 14, 56);

    // Info Pelanggan (Kanan)
    doc.setFont("helvetica", "bold");
    doc.text("KEPADA:", 130, 40);
    doc.setFont("helvetica", "normal");
    doc.text(piutang.namaPelanggan, 130, 46);

    // Info Invoice (Kanan)
    doc.setFont("helvetica", "bold");
    doc.text("Invoice #:", 130, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`INV-${piutang.id}`, 160, 60);

    doc.setFont("helvetica", "bold");
    doc.text("Tanggal Terbit:", 130, 65);
    doc.setFont("helvetica", "normal");
    doc.text(piutang.tanggalPembelian, 160, 65);

    doc.setFont("helvetica", "bold");
    doc.text("Jatuh Tempo:", 130, 70);
    doc.setFont("helvetica", "normal");
    doc.text(piutang.tanggalJatuhTempo, 160, 70);

    let lastY = 85;

    // Tabel Item
    doc.autoTable({
      startY: lastY,
      head: [["Deskripsi", "Kuantitas", "Harga Satuan", "Total"]],
      body: [
        [
          piutang.keterangan,
          1,
          this.formatCurrency(piutang.jumlah),
          this.formatCurrency(piutang.jumlah),
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: "#374151" },
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
    lastY = doc.autoTable.previous.finalY;

    // Bagian Total
    const totalX = 150; // X-coordinate untuk perataan
    const totalYStart = lastY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text("Subtotal:", totalX, totalYStart, { align: "right" });
    doc.text(this.formatCurrency(piutang.jumlah), 200, totalYStart, {
      align: "right",
    });

    doc.text("Total Pembayaran:", totalX, totalYStart + 7, {
      align: "right",
    });
    doc.text(`(${this.formatCurrency(totalPaid)})`, 200, totalYStart + 7, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.text("SISA TAGIHAN:", totalX, totalYStart + 14, {
      align: "right",
    });
    doc.text(this.formatCurrency(remainingAmount), 200, totalYStart + 14, {
      align: "right",
    });

    lastY = totalYStart + 25;

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Catatan:", 14, lastY);
    doc.text(
      "Mohon lakukan pembayaran sebelum tanggal jatuh tempo.",
      14,
      lastY + 5
    );
    doc.text("Terima kasih atas bisnis Anda.", 105, lastY + 20, {
      align: "center",
    });

    // Simpan PDF
    doc.save(
      `Invoice_${piutang.namaPelanggan.replace(/\s+/g, "_")}_${piutang.id}.pdf`
    );
    this.closeModal();
  },

  formatCurrency(value) {
    if (isNaN(parseFloat(value))) return "";
    return `Rp ${parseFloat(value).toLocaleString("id-ID")}`;
  },
  formatMonth(monthString) {
    const date = new Date(monthString + "-02");
    return date.toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    });
  },
  showLoadModal() {
    const today = new Date().toISOString().slice(0, 7);
    const body = `<p class="text-sm text-gray-600 mb-4">Pilih tahun dan bulan data yang ingin Anda muat. Perubahan yang belum disimpan pada periode saat ini akan hilang.</p> <input type="month" id="month-selector" class="w-full p-2 border rounded-md" value="${today}">`;
    const actions = [
      {
        text: "Muat Data",
        class: "bg-blue-600 hover:bg-blue-700",
        callback: () => {
          const selectedMonth = document.getElementById("month-selector").value;
          if (selectedMonth) {
            this.loadData(selectedMonth);
            this.renderAll();
            this.closeModal();
            this.showModal(
              "Sukses",
              `Berhasil memuat data untuk periode ${this.formatMonth(
                selectedMonth
              )}.`
            );
          }
        },
      },
      {
        text: "Batal",
        class: "bg-gray-600 hover:bg-gray-700",
        callback: () => this.closeModal(),
      },
    ];
    this.showModal("Muat Data Periode", body, actions);
  },
  showModal(title, message, actions = []) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = message;
    const actionsContainer = document.getElementById("modal-actions");
    actionsContainer.innerHTML = "";
    if (actions.length === 0) {
      actions.push({
        text: "Tutup",
        class: "bg-blue-600 hover:bg-blue-700",
        callback: () => this.closeModal(),
      });
    }
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.textContent = action.text;
      button.className = `py-2 px-4 text-white rounded-md text-sm font-medium ${action.class}`;
      button.onclick = action.callback;
      actionsContainer.appendChild(button);
    });
    document.getElementById("modal").classList.remove("hidden");
  },
  closeModal() {
    document.getElementById("modal").classList.add("hidden");
  },
};
window.onload = () => app.init();
